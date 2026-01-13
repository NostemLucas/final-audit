import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import type * as ms from 'ms'
import { TokenStorageService, REDIS_PREFIXES } from '@core/cache'

export interface TwoFactorPayload {
  sub: string // userId
  code: string
  type: '2fa'
}

/**
 * Servicio de gestión de códigos 2FA
 *
 * Soporta dos modos (configurable por ENV):
 * 1. Redis (default) - Códigos temporales almacenados en Redis
 * 2. JWT - Códigos firmados como JWT (opcional, menos común para 2FA)
 *
 * Variables de entorno:
 * - TWO_FACTOR_TOKEN_MODE: 'redis' | 'jwt' | 'both' (default: 'redis')
 * - TWO_FACTOR_CODE_LENGTH: Longitud del código (default: 6)
 * - TWO_FACTOR_CODE_EXPIRES_IN: '5m', '10m', etc. (default: '5m')
 * - TWO_FACTOR_JWT_SECRET: Secret para firmar JWTs (requerido si mode incluye 'jwt')
 *
 * Casos de uso:
 * - redis: Código temporal en Redis (recomendado para 2FA)
 * - jwt: Código firmado como JWT (menos común, útil para sistemas distribuidos)
 * - both: Genera JWT pero valida contra Redis
 */
@Injectable()
export class TwoFactorTokenService {
  private readonly tokenMode: 'redis' | 'jwt' | 'both'
  private readonly codeLength: number
  private readonly codeExpiry: string
  private readonly jwtSecret?: string

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.tokenMode = configService.get('TWO_FACTOR_TOKEN_MODE', 'redis')
    this.codeLength = configService.get('TWO_FACTOR_CODE_LENGTH', 6)
    this.codeExpiry = configService.get('TWO_FACTOR_CODE_EXPIRES_IN', '5m')

    if (this.tokenMode === 'jwt' || this.tokenMode === 'both') {
      const secret = configService.get<string>('TWO_FACTOR_JWT_SECRET')
      if (!secret) {
        throw new Error(
          'TWO_FACTOR_JWT_SECRET is required when using JWT mode',
        )
      }
      this.jwtSecret = secret
    }
  }

  /**
   * Genera un código 2FA
   *
   * @param userId - ID del usuario
   * @returns Código generado y token (pueden ser el mismo o diferentes según modo)
   */
  async generateCode(
    userId: string,
  ): Promise<{ code: string; token: string }> {
    const code = this.generateNumericCode()

    switch (this.tokenMode) {
      case 'redis': {
        // Solo Redis: almacenar código, devolver código
        await this.storeInRedis(userId, code)
        return { code, token: code }
      }

      case 'jwt': {
        // Solo JWT: generar token firmado
        const token = this.generateJWT(userId, code)
        return { code, token }
      }

      case 'both': {
        // Híbrido: almacenar en Redis, devolver JWT
        await this.storeInRedis(userId, code)
        const token = this.generateJWT(userId, code)
        return { code, token }
      }

      default:
        throw new Error(`Invalid token mode: ${this.tokenMode}`)
    }
  }

  /**
   * Valida un código 2FA
   *
   * @param userId - ID del usuario
   * @param code - Código a validar
   * @param token - Token opcional (si se usa JWT)
   * @returns true si el código es válido
   */
  async validateCode(
    userId: string,
    code: string,
    token?: string,
  ): Promise<boolean> {
    try {
      switch (this.tokenMode) {
        case 'redis':
          // Solo Redis: validar contra Redis
          return await this.validateRedisCode(userId, code)

        case 'jwt': {
          // Solo JWT: verificar firma y código
          if (!token) return false
          const payload = this.validateJWT(token)
          return payload?.sub === userId && payload?.code === code
        }

        case 'both': {
          // Híbrido: verificar JWT Y validar contra Redis
          if (!token) return false
          const payload = this.validateJWT(token)
          if (!payload || payload.sub !== userId || payload.code !== code) {
            return false
          }
          return await this.validateRedisCode(userId, code)
        }

        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * Revoca un código 2FA (lo elimina de Redis)
   *
   * @param userId - ID del usuario
   * @param code - Código a revocar
   * @returns true si se revocó exitosamente
   */
  async revokeCode(userId: string, code: string): Promise<boolean> {
    if (this.tokenMode === 'jwt') {
      // JWT puro no es revocable
      return false
    }

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
   * @param userId - ID del usuario
   * @returns Número de códigos revocados
   */
  async revokeAllUserCodes(userId: string): Promise<number> {
    if (this.tokenMode === 'jwt') {
      return 0
    }

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
      ttlSeconds: this.getExpirySeconds(this.codeExpiry),
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

    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.codeExpiry as ms.StringValue,
    })
  }

  /**
   * Valida un JWT y devuelve el payload
   */
  private validateJWT(token: string): TwoFactorPayload | null {
    try {
      const payload = this.jwtService.verify<TwoFactorPayload>(token, {
        secret: this.jwtSecret,
      })

      if (payload.type !== '2fa') {
        return null
      }

      return payload
    } catch {
      return null
    }
  }

  /**
   * Convierte string de expiración a segundos
   */
  private getExpirySeconds(expiryString: string): number {
    const unit = expiryString.slice(-1)
    const value = parseInt(expiryString.slice(0, -1), 10)

    switch (unit) {
      case 's':
        return value
      case 'm':
        return value * 60
      case 'h':
        return value * 3600
      case 'd':
        return value * 86400
      default:
        return 300 // default 5 minutos
    }
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
