import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import {
  TokenStorageService,
  REDIS_PREFIXES,
  CACHE_KEYS,
  REDIS_CLIENT,
} from '@core/cache'
import { RateLimitService } from '@core/security'
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config'
import { JwtTokenHelper } from '../helpers'
import { TooManyAttemptsException } from '../exceptions'

export interface TwoFactorPayload {
  sub: string // userId
  tokenId: string // Identificador único del código
  type: '2fa'
}

/**
 * Servicio de gestión de códigos 2FA (Two-Factor Authentication)
 *
 * Usa un enfoque híbrido (JWT + Redis) para máxima seguridad:
 * - JWT: Token stateless que vincula sesión con código (NO contiene el código)
 * - Redis: Almacenamiento del código numérico con TTL
 * - Rate Limiting: Protección contra fuerza bruta
 *
 * Mejoras de seguridad implementadas:
 * 1. Token JWT OBLIGATORIO - Vincula sesión con código
 * 2. Código NO en JWT - Solo en Redis, previene exposición
 * 3. Rate Limiting - Máximo 5 intentos por código en 5 minutos
 * 4. Un solo uso - Código se elimina después de validación exitosa
 * 5. TokenId único - Cada código tiene identificador único
 *
 * Variables de entorno:
 * - TWO_FACTOR_CODE_LENGTH: Longitud del código numérico (default: 6)
 * - TWO_FACTOR_CODE_EXPIRES_IN: Tiempo de expiración (default: '5m')
 * - TWO_FACTOR_JWT_SECRET: Secret para firmar JWTs (REQUERIDO)
 */
@Injectable()
export class TwoFactorTokenService {
  private readonly codeLength: number
  private readonly codeExpiry: string
  private readonly jwtSecret: string
  private readonly maxAttempts = RATE_LIMIT_CONFIG.twoFactor.maxAttempts
  private readonly attemptsWindow = RATE_LIMIT_CONFIG.twoFactor.windowMinutes

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly jwtTokenHelper: JwtTokenHelper,
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.codeLength = configService.get('TWO_FACTOR_CODE_LENGTH', 6)
    this.codeExpiry = configService.get('TWO_FACTOR_CODE_EXPIRES_IN', '5m')

    const secret = configService.get<string>('TWO_FACTOR_JWT_SECRET')
    if (!secret) {
      throw new Error(
        'TWO_FACTOR_JWT_SECRET is required. Please set it in your .env file.',
      )
    }
    this.jwtSecret = secret
  }

  /**
   * Genera un código 2FA
   *
   * Flujo SEGURO:
   * 1. Genera un código numérico aleatorio (6 dígitos)
   * 2. Genera un tokenId único (UUID)
   * 3. Almacena código en Redis: 2fa:code:{tokenId} -> "123456"
   * 4. Genera JWT con userId + tokenId (NO el código)
   * 5. Devuelve código (para enviar por email) y token (para validación)
   *
   * Ventajas:
   * - Código no expuesto en JWT (solo en Redis cifrado)
   * - Token vincula sesión con código específico
   * - Rate limiting por tokenId previene fuerza bruta
   *
   * @param userId - ID del usuario
   * @returns Objeto con code (para enviar al usuario) y token (JWT para validación)
   */
  async generateCode(userId: string): Promise<{ code: string; token: string }> {
    // Generar tokenId único
    const tokenId = uuidv4()

    // Generar código numérico aleatorio
    const code = this.generateNumericCode()

    // Almacenar código en Redis: 2fa:code:{tokenId} -> "123456"
    await this.storeCodeInRedis(tokenId, code)

    // Generar JWT con userId + tokenId (NO el código)
    const token = this.generateJWT(userId, tokenId)

    return { code, token }
  }

  /**
   * Valida un código 2FA
   *
   * Flujo de validación SEGURO:
   * 1. Token JWT es OBLIGATORIO (lanza error si no se provee)
   * 2. Verifica firma JWT y extrae userId + tokenId
   * 3. Verifica rate limiting (máximo 5 intentos por tokenId)
   * 4. Obtiene código de Redis usando tokenId
   * 5. Compara código con el proporcionado por usuario
   * 6. Si es válido: elimina código (one-time use) y resetea intentos
   * 7. Si es inválido: incrementa contador de intentos
   *
   * IMPORTANTE: Token es OBLIGATORIO para prevenir ataques sin sesión
   *
   * @param userId - ID del usuario
   * @param code - Código numérico a validar
   * @param token - Token JWT (OBLIGATORIO)
   * @returns true si el código es válido
   * @throws TooManyAttemptsException si excede intentos
   */
  async validateCode(
    userId: string,
    code: string,
    token: string, // ← OBLIGATORIO (sin '?')
  ): Promise<boolean> {
    // 1. Validar JWT y extraer payload
    const payload = this.jwtTokenHelper.verifyToken<TwoFactorPayload>(
      token,
      this.jwtSecret,
    )

    if (
      !payload ||
      payload.sub !== userId ||
      !this.jwtTokenHelper.validateTokenType(payload, '2fa')
    ) {
      return false
    }

    const { tokenId } = payload

    // 2. Verificar rate limiting por tokenId
    const rateLimitKey = CACHE_KEYS.TWO_FACTOR_VERIFY_ATTEMPTS(tokenId)
    const canAttempt = await this.rateLimitService.checkLimit(
      rateLimitKey,
      this.maxAttempts,
      this.attemptsWindow,
    )

    if (!canAttempt) {
      const remaining =
        await this.rateLimitService.getTimeUntilReset(rateLimitKey)
      throw new TooManyAttemptsException(
        `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }

    // 3. Obtener código almacenado en Redis
    const storedCode = await this.getCodeFromRedis(tokenId)

    if (!storedCode) {
      // Código no existe o expiró
      return false
    }

    // 4. Comparar códigos (timing-safe comparison)
    if (!this.secureCompare(code, storedCode)) {
      // Código incorrecto - incrementar intentos
      await this.rateLimitService.incrementAttempts(
        rateLimitKey,
        this.attemptsWindow,
      )
      return false
    }

    // 5. Código válido - eliminar de Redis (one-time use) y resetear intentos
    await this.deleteCodeFromRedis(tokenId)
    await this.rateLimitService.resetAttempts(rateLimitKey)

    return true
  }

  /**
   * Revoca todos los códigos 2FA de un usuario
   *
   * NOTA: Esta implementación necesita ser actualizada para usar tokenId
   * Por ahora, revoca códigos antiguos por userId (legacy)
   *
   * @param userId - ID del usuario
   * @returns Número de códigos revocados
   */
  async revokeAllUserCodes(userId: string): Promise<number> {
    return await this.tokenStorage.revokeAllUserTokens(
      userId,
      REDIS_PREFIXES.TWO_FACTOR,
    )
  }

  /**
   * Genera un código numérico aleatorio
   */
  private generateNumericCode(): string {
    const max = Math.pow(10, this.codeLength)
    const code = crypto.randomInt(0, max)
    return code.toString().padStart(this.codeLength, '0')
  }

  /**
   * Almacena el código en Redis usando tokenId como clave
   * Key: auth:2fa:code:{tokenId}
   * Value: "123456"
   */
  private async storeCodeInRedis(tokenId: string, code: string): Promise<void> {
    const key = CACHE_KEYS.TWO_FACTOR_CODE(tokenId)
    const ttlSeconds = this.jwtTokenHelper.getExpirySeconds(
      this.codeExpiry,
      300,
    )

    await this.redis.setex(key, ttlSeconds, code)
  }

  /**
   * Obtiene el código de Redis usando tokenId
   */
  private async getCodeFromRedis(tokenId: string): Promise<string | null> {
    const key = CACHE_KEYS.TWO_FACTOR_CODE(tokenId)

    try {
      const code = await this.redis.get(key)
      return code || null
    } catch (error) {
      // Log error pero no expongas detalles al cliente
      return null
    }
  }

  /**
   * Elimina el código de Redis
   */
  private async deleteCodeFromRedis(tokenId: string): Promise<void> {
    const key = CACHE_KEYS.TWO_FACTOR_CODE(tokenId)
    await this.redis.del(key)
  }

  /**
   * Genera un JWT firmado con userId + tokenId (NO el código)
   */
  private generateJWT(userId: string, tokenId: string): string {
    const payload: TwoFactorPayload = {
      sub: userId,
      tokenId,
      type: '2fa',
    }

    return this.jwtTokenHelper.generateSignedToken(
      payload,
      this.jwtSecret,
      this.codeExpiry,
    )
  }

  /**
   * Comparación segura de strings (timing-safe)
   * Previene timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  }

  /**
   * Obtiene el TTL restante de un código
   */
  async getCodeTTL(tokenId: string): Promise<number> {
    return await this.tokenStorage.getTokenTTL(
      tokenId,
      '',
      REDIS_PREFIXES.TWO_FACTOR,
    )
  }

  /**
   * Obtiene los intentos restantes para un tokenId
   */
  async getRemainingAttempts(tokenId: string): Promise<number> {
    const rateLimitKey = CACHE_KEYS.TWO_FACTOR_VERIFY_ATTEMPTS(tokenId)
    return await this.rateLimitService.getRemainingAttempts(
      rateLimitKey,
      this.maxAttempts,
    )
  }
}
