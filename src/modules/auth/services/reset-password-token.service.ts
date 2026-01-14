import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TokenStorageService, REDIS_PREFIXES, CACHE_KEYS } from '@core/cache'
import { RateLimitService } from '@core/security'
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config'
import { JwtTokenHelper } from '../helpers'
import { TooManyAttemptsException } from '../exceptions'

export interface ResetPasswordPayload {
  sub: string // userId
  tokenId: string
  type: 'reset-password'
}

/**
 * Servicio de gestión de tokens de reset password
 *
 * Usa un enfoque híbrido (JWT + Redis) que combina lo mejor de ambos mundos:
 * - JWT: Token stateless que puede ser verificado sin consultar la base de datos
 * - Redis: Almacenamiento temporal que permite revocar tokens antes de su expiración
 *
 * ¿Por qué híbrido?
 * - Seguridad: Los tokens pueden ser revocados inmediatamente (ej: después de cambiar contraseña)
 * - Un solo uso: Una vez usado, el token se elimina de Redis y no puede ser reutilizado
 * - Verificación rápida: JWT contiene toda la información necesaria
 * - Trazabilidad: Podemos auditar y listar tokens activos en Redis
 *
 * Este es el estándar de la industria para procesos sensibles como recuperación de cuenta.
 *
 * Variables de entorno:
 * - RESET_PASSWORD_TOKEN_EXPIRES_IN: Tiempo de expiración (default: '1h')
 * - RESET_PASSWORD_JWT_SECRET: Secret para firmar JWTs (REQUERIDO)
 */
@Injectable()
export class ResetPasswordTokenService {
  private readonly tokenExpiry: string
  private readonly jwtSecret: string
  private readonly maxAttemptsByIp =
    RATE_LIMIT_CONFIG.resetPassword.maxAttemptsByIp
  private readonly attemptsWindow =
    RATE_LIMIT_CONFIG.resetPassword.windowMinutes

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly jwtTokenHelper: JwtTokenHelper,
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
  ) {
    this.tokenExpiry = configService.get(
      'RESET_PASSWORD_TOKEN_EXPIRES_IN',
      '1h',
    )

    const secret = this.configService.get<string>('RESET_PASSWORD_JWT_SECRET')
    if (!secret) {
      throw new Error(
        'RESET_PASSWORD_JWT_SECRET is required. Please set it in your .env file.',
      )
    }
    this.jwtSecret = secret
  }

  /**
   * Genera un token de reset password
   *
   * Flujo:
   * 1. Genera un tokenId único (UUID)
   * 2. Almacena el tokenId en Redis con TTL
   * 3. Genera un JWT firmado que contiene userId y tokenId
   * 4. Devuelve el JWT al cliente
   *
   * El JWT puede ser verificado sin consultar Redis, pero para mayor seguridad
   * siempre validamos contra Redis para garantizar que no ha sido revocado.
   *
   * @param userId - ID del usuario
   * @returns Token JWT firmado
   */
  async generateToken(userId: string): Promise<string> {
    // Generar tokenId único
    const tokenId = this.tokenStorage.generateTokenId()

    // Almacenar en Redis con TTL
    await this.storeInRedis(userId, tokenId)

    // Generar y devolver JWT
    return this.generateJWT(userId, tokenId)
  }

  /**
   * Valida un token de reset password CON RATE LIMITING
   *
   * Flujo de validación híbrido con protección contra fuerza bruta:
   * 1. Verifica rate limiting por IP (10 intentos en 60 min)
   * 2. Verifica la firma del JWT (criptográficamente seguro)
   * 3. Verifica que el JWT no haya expirado
   * 4. Extrae el userId y tokenId del JWT
   * 5. Verifica que el tokenId existe en Redis (no ha sido revocado)
   * 6. Si es válido, resetea intentos; si no, incrementa contador
   *
   * Esto garantiza:
   * - Protección contra fuerza bruta (rate limiting)
   * - El token no ha sido adulterado (firma JWT)
   * - El token no ha expirado (exp del JWT)
   * - El token no ha sido revocado (existe en Redis)
   * - El token no ha sido usado (se elimina de Redis después del primer uso)
   *
   * @param token - Token JWT a validar
   * @param ip - Dirección IP del usuario (para rate limiting)
   * @returns userId si el token es válido, null si no
   * @throws TooManyAttemptsException si excede intentos
   */
  async validateToken(token: string, ip: string): Promise<string | null> {
    // 1. Verificar rate limiting por IP
    const rateLimitKeyIp = CACHE_KEYS.RESET_PASSWORD_ATTEMPTS_IP(ip)
    const canAttemptByIp = await this.rateLimitService.checkLimit(
      rateLimitKeyIp,
      this.maxAttemptsByIp,
      this.attemptsWindow,
    )

    if (!canAttemptByIp) {
      const remaining =
        await this.rateLimitService.getTimeUntilReset(rateLimitKeyIp)
      throw new TooManyAttemptsException(
        `Demasiados intentos desde esta IP. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }

    try {
      // 2. Verificar JWT (firma y expiración)
      const payload = this.jwtTokenHelper.verifyToken<ResetPasswordPayload>(
        token,
        this.jwtSecret,
      )

      if (!payload) {
        await this.rateLimitService.incrementAttempts(
          rateLimitKeyIp,
          this.attemptsWindow,
        )
        return null
      }

      // 3. Verificar que es un token de reset password
      if (!this.jwtTokenHelper.validateTokenType(payload, 'reset-password')) {
        await this.rateLimitService.incrementAttempts(
          rateLimitKeyIp,
          this.attemptsWindow,
        )
        return null
      }

      // 4. Verificar que el token existe en Redis (no revocado)
      const existsInRedis = await this.tokenStorage.validateToken(
        payload.sub,
        payload.tokenId,
        REDIS_PREFIXES.RESET_PASSWORD,
      )

      if (!existsInRedis) {
        await this.rateLimitService.incrementAttempts(
          rateLimitKeyIp,
          this.attemptsWindow,
        )
        return null
      }

      // 5. Token válido - resetear intentos
      await this.rateLimitService.resetAttempts(rateLimitKeyIp)

      return payload.sub
    } catch {
      await this.rateLimitService.incrementAttempts(
        rateLimitKeyIp,
        this.attemptsWindow,
      )
      return null
    }
  }

  /**
   * Revoca un token de reset password
   *
   * Extrae el userId y tokenId del JWT y elimina el token de Redis.
   * Esto hace que el token sea inmediatamente inválido incluso si
   * el JWT aún no ha expirado.
   *
   * Casos de uso:
   * - Usuario cambia su contraseña exitosamente
   * - Administrador revoca manualmente el token
   * - Usuario solicita un nuevo token (revocar el anterior)
   *
   * @param token - Token JWT a revocar
   * @returns true si se revocó exitosamente, false si el token es inválido
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      // Extraer userId y tokenId del JWT
      const payload =
        this.jwtTokenHelper.decodeToken<ResetPasswordPayload>(token)
      if (!payload) return false

      // Eliminar token de Redis
      await this.tokenStorage.revokeToken(
        payload.sub,
        payload.tokenId,
        REDIS_PREFIXES.RESET_PASSWORD,
      )

      return true
    } catch {
      return false
    }
  }

  /**
   * Revoca todos los tokens de reset password de un usuario
   *
   * Útil cuando:
   * - Usuario cambia su email/contraseña
   * - Administrador invalida todos los tokens de un usuario
   * - Usuario reporta acceso no autorizado
   *
   * @param userId - ID del usuario
   * @returns Número de tokens revocados
   */
  async revokeUserTokens(userId: string): Promise<number> {
    return await this.tokenStorage.revokeAllUserTokens(
      userId,
      REDIS_PREFIXES.RESET_PASSWORD,
    )
  }

  /**
   * Obtiene el TTL restante de un token
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @returns TTL en segundos
   */
  async getTokenTTL(userId: string, tokenId: string): Promise<number> {
    return await this.tokenStorage.getTokenTTL(
      userId,
      tokenId,
      REDIS_PREFIXES.RESET_PASSWORD,
    )
  }

  /**
   * Almacena el token en Redis
   */
  private async storeInRedis(userId: string, tokenId: string): Promise<void> {
    await this.tokenStorage.storeToken(userId, tokenId, {
      prefix: REDIS_PREFIXES.RESET_PASSWORD,
      ttlSeconds: this.jwtTokenHelper.getExpirySeconds(this.tokenExpiry),
    })
  }

  /**
   * Genera un JWT firmado
   */
  private generateJWT(userId: string, tokenId: string): string {
    const payload: ResetPasswordPayload = {
      sub: userId,
      tokenId,
      type: 'reset-password',
    }

    return this.jwtTokenHelper.generateSignedToken(
      payload,
      this.jwtSecret,
      this.tokenExpiry,
    )
  }

  /**
   * Valida un token almacenado en Redis cuando tenemos el userId
   *
   * Método auxiliar para casos donde ya tienes el userId y tokenId.
   * Normalmente se usa validateToken(jwt) que hace la validación completa.
   */
  async validateTokenWithUserId(
    userId: string,
    tokenId: string,
  ): Promise<boolean> {
    return await this.tokenStorage.validateToken(
      userId,
      tokenId,
      REDIS_PREFIXES.RESET_PASSWORD,
    )
  }
}
