import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { TokenStorageService, REDIS_PREFIXES } from '@core/cache'
import { JwtTokenHelper } from '../helpers'

export interface TwoFactorPayload {
  sub: string // userId
  code: string
  type: '2fa'
}

/**
 * Servicio de gestión de códigos 2FA (Two-Factor Authentication)
 *
 * Usa un enfoque híbrido (JWT + Redis) para máxima seguridad:
 * - JWT: Token stateless que puede ser transmitido al cliente de forma segura
 * - Redis: Almacenamiento temporal que permite códigos de un solo uso
 * - Código numérico: Fácil de leer y transcribir por el usuario
 *
 * ¿Por qué híbrido para 2FA?
 * - Un solo uso: El código se elimina de Redis inmediatamente después de ser usado
 * - No reutilizable: Aunque alguien intercepte el código, solo funciona una vez
 * - Tiempo limitado: Los códigos expiran en 5 minutos por defecto
 * - Revocable: Los códigos pueden ser invalidados inmediatamente
 * - Trazabilidad: Podemos auditar intentos y códigos activos
 *
 * Este es el estándar recomendado por OWASP para autenticación de dos factores.
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

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly jwtTokenHelper: JwtTokenHelper,
    private readonly configService: ConfigService,
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
   * Flujo:
   * 1. Genera un código numérico aleatorio (6 dígitos por defecto)
   * 2. Almacena el código en Redis con TTL corto (5 minutos por defecto)
   * 3. Genera un JWT firmado que contiene userId y código
   * 4. Devuelve tanto el código (para mostrar al usuario) como el token JWT
   *
   * El código se envía al usuario (email/SMS) y el JWT puede almacenarse
   * en el cliente para validación posterior.
   *
   * @param userId - ID del usuario
   * @returns Objeto con code (para enviar al usuario) y token (JWT para validación)
   */
  async generateCode(userId: string): Promise<{ code: string; token: string }> {
    // Generar código numérico aleatorio
    const code = this.generateNumericCode()

    // Almacenar código en Redis con TTL
    await this.storeInRedis(userId, code)

    // Generar JWT que contiene el código
    const token = this.generateJWT(userId, code)

    return { code, token }
  }

  /**
   * Valida un código 2FA
   *
   * Flujo de validación híbrido:
   * 1. Verifica la firma del JWT (si se proporciona)
   * 2. Verifica que el JWT no haya expirado
   * 3. Verifica que el userId y código del JWT coincidan con los parámetros
   * 4. Verifica que el código existe en Redis (no ha sido revocado)
   * 5. Si todo es válido, ELIMINA el código de Redis (un solo uso)
   * 6. Devuelve true solo si todas las validaciones pasan
   *
   * Esto garantiza que:
   * - El código no ha sido adulterado (firma JWT)
   * - El código no ha expirado (TTL de Redis y exp del JWT)
   * - El código solo puede usarse una vez (se elimina después del primer uso)
   * - El código pertenece al usuario correcto (userId en JWT)
   *
   * @param userId - ID del usuario
   * @param code - Código numérico a validar
   * @param token - Token JWT (opcional, si no se provee solo valida contra Redis)
   * @returns true si el código es válido y se usó exitosamente
   */
  async validateCode(
    userId: string,
    code: string,
    token?: string,
  ): Promise<boolean> {
    try {
      // Si se proporciona token JWT, validarlo primero
      if (token) {
        const payload = this.jwtTokenHelper.verifyToken<TwoFactorPayload>(
          token,
          this.jwtSecret,
        )
        if (
          !payload ||
          payload.sub !== userId ||
          payload.code !== code ||
          !this.jwtTokenHelper.validateTokenType(payload, '2fa')
        ) {
          return false
        }
      }

      // Validar contra Redis (esto también elimina el código si es válido)
      return await this.validateRedisCode(userId, code)
    } catch {
      return false
    }
  }

  /**
   * Revoca un código 2FA específico
   *
   * Elimina el código de Redis, haciendo que cualquier intento posterior
   * de usar ese código falle, incluso si el JWT aún es válido.
   *
   * Casos de uso:
   * - Usuario solicita un nuevo código (revocar el anterior)
   * - Detectar intentos sospechosos (revocar por seguridad)
   * - Usuario completa el login exitosamente (limpiar código usado)
   *
   * @param userId - ID del usuario
   * @param code - Código numérico a revocar
   * @returns true si se revocó exitosamente
   */
  async revokeCode(userId: string, code: string): Promise<boolean> {
    try {
      await this.tokenStorage.revokeToken(
        userId,
        code,
        REDIS_PREFIXES.TWO_FACTOR,
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * Revoca todos los códigos 2FA de un usuario
   *
   * Útil cuando:
   * - Usuario cambia su contraseña o email
   * - Detectar actividad sospechosa en la cuenta
   * - Usuario reporta acceso no autorizado
   * - Administrador invalida todos los códigos pendientes
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
   * Almacena el código en Redis
   */
  private async storeInRedis(userId: string, code: string): Promise<void> {
    await this.tokenStorage.storeToken(userId, code, {
      prefix: REDIS_PREFIXES.TWO_FACTOR,
      ttlSeconds: this.jwtTokenHelper.getExpirySeconds(this.codeExpiry, 300),
    })
  }

  /**
   * Valida un código almacenado en Redis
   */
  private async validateRedisCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const isValid = await this.tokenStorage.validateToken(
      userId,
      code,
      REDIS_PREFIXES.TWO_FACTOR,
    )

    // Si el código es válido, revocarlo inmediatamente (one-time use)
    if (isValid) {
      await this.revokeCode(userId, code)
    }

    return isValid
  }

  /**
   * Genera un JWT firmado con el código
   */
  private generateJWT(userId: string, code: string): string {
    const payload: TwoFactorPayload = {
      sub: userId,
      code,
      type: '2fa',
    }

    return this.jwtTokenHelper.generateSignedToken(
      payload,
      this.jwtSecret,
      this.codeExpiry,
    )
  }

  /**
   * Obtiene el TTL restante de un código
   */
  async getCodeTTL(userId: string, code: string): Promise<number> {
    return await this.tokenStorage.getTokenTTL(
      userId,
      code,
      REDIS_PREFIXES.TWO_FACTOR,
    )
  }
}
