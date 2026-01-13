import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type * as ms from 'ms'
import { TokenStorageService, REDIS_PREFIXES } from '@core/cache'

export interface ResetPasswordPayload {
  sub: string // userId
  tokenId: string
  type: 'reset-password'
}

/**
 * Servicio de gestión de tokens de reset password
 *
 * Soporta dos modos (configurable por ENV):
 * 1. Redis (default) - Tokens temporales almacenados en Redis
 * 2. JWT - Tokens stateless firmados (opcional)
 *
 * Variables de entorno:
 * - RESET_PASSWORD_TOKEN_MODE: 'redis' | 'jwt' | 'both' (default: 'redis')
 * - RESET_PASSWORD_TOKEN_EXPIRES_IN: '15m', '1h', etc. (default: '1h')
 * - RESET_PASSWORD_JWT_SECRET: Secret para firmar JWTs (requerido si mode incluye 'jwt')
 *
 * Casos de uso:
 * - redis: Token temporal en Redis, más seguro (puede ser revocado)
 * - jwt: Token stateless, no requiere Redis pero no puede ser revocado antes de expirar
 * - both: Genera JWT pero valida contra Redis (revocable + stateless)
 */
@Injectable()
export class ResetPasswordTokenService {
  private readonly tokenMode: 'redis' | 'jwt' | 'both'
  private readonly tokenExpiry: string
  private readonly jwtSecret?: string

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.tokenMode = configService.get('RESET_PASSWORD_TOKEN_MODE', 'redis')
    this.tokenExpiry = configService.get('RESET_PASSWORD_TOKEN_EXPIRES_IN', '1h')

    if (this.tokenMode === 'jwt' || this.tokenMode === 'both') {
      const secret = configService.get<string>('RESET_PASSWORD_JWT_SECRET')
      if (!secret) {
        throw new Error(
          'RESET_PASSWORD_JWT_SECRET is required when using JWT mode',
        )
      }
      this.jwtSecret = secret
    }
  }

  /**
   * Genera un token de reset password
   *
   * @param userId - ID del usuario
   * @returns Token generado (UUID o JWT según configuración)
   */
  async generateToken(userId: string): Promise<string> {
    const tokenId = this.tokenStorage.generateTokenId()

    switch (this.tokenMode) {
      case 'redis':
        // Solo Redis: devolver UUID, almacenar en Redis
        await this.storeInRedis(userId, tokenId)
        return tokenId

      case 'jwt':
        // Solo JWT: devolver token firmado, NO almacenar en Redis
        return this.generateJWT(userId, tokenId)

      case 'both':
        // Híbrido: devolver JWT firmado, PERO validar contra Redis
        await this.storeInRedis(userId, tokenId)
        return this.generateJWT(userId, tokenId)

      default:
        throw new Error(`Invalid token mode: ${this.tokenMode}`)
    }
  }

  /**
   * Valida un token de reset password
   *
   * @param token - Token a validar (UUID o JWT)
   * @returns userId si el token es válido, null si no
   */
  async validateToken(token: string): Promise<string | null> {
    try {
      switch (this.tokenMode) {
        case 'redis':
          // Solo Redis: buscar token en Redis
          return await this.validateRedisToken(token)

        case 'jwt':
          // Solo JWT: verificar firma y expiración
          return this.validateJWT(token)

        case 'both':
          // Híbrido: verificar JWT Y validar contra Redis
          const userId = this.validateJWT(token)
          if (!userId) return null

          const payload = this.decodeJWT(token)
          const existsInRedis = await this.tokenStorage.validateToken(
            userId,
            payload.tokenId,
            REDIS_PREFIXES.RESET_PASSWORD,
          )

          return existsInRedis ? userId : null

        default:
          return null
      }
    } catch {
      return null
    }
  }

  /**
   * Revoca un token de reset password
   *
   * @param token - Token a revocar
   * @returns true si se revocó, false si no existe o no es revocable
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      if (this.tokenMode === 'jwt') {
        // JWT puro no es revocable (stateless)
        return false
      }

      if (this.tokenMode === 'both') {
        // Híbrido: extraer userId y tokenId del JWT
        const payload = this.decodeJWT(token)
        await this.tokenStorage.revokeToken(
          payload.sub,
          payload.tokenId,
          REDIS_PREFIXES.RESET_PASSWORD,
        )
        return true
      }

      // Redis: el token es el tokenId directamente
      // Necesitamos buscar por patrón (no tenemos userId aquí)
      // Opción: almacenar mapping token -> userId
      // Por ahora, asumimos que se debe llamar con revokeUserTokens(userId)
      return false
    } catch {
      return false
    }
  }

  /**
   * Revoca todos los tokens de reset password de un usuario
   *
   * @param userId - ID del usuario
   * @returns Número de tokens revocados
   */
  async revokeUserTokens(userId: string): Promise<number> {
    if (this.tokenMode === 'jwt') {
      // JWT puro no es revocable
      return 0
    }

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
      ttlSeconds: this.getExpirySeconds(this.tokenExpiry),
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

    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.tokenExpiry as ms.StringValue,
    })
  }

  /**
   * Valida un token almacenado en Redis
   */
  private async validateRedisToken(tokenId: string): Promise<string | null> {
    // Para validar solo con tokenId, necesitamos buscar por patrón
    // Esto es costoso, mejor diseño: usar getTokenData que incluye userId
    // Por ahora, asumimos que se valida con validateTokenWithUserId
    return null
  }

  /**
   * Valida un token almacenado en Redis cuando tenemos el userId
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

  /**
   * Valida un JWT y devuelve el userId
   */
  private validateJWT(token: string): string | null {
    try {
      const payload = this.jwtService.verify<ResetPasswordPayload>(token, {
        secret: this.jwtSecret,
      })

      if (payload.type !== 'reset-password') {
        return null
      }

      return payload.sub
    } catch {
      return null
    }
  }

  /**
   * Decodifica un JWT sin verificar
   */
  private decodeJWT(token: string): ResetPasswordPayload {
    const decoded = this.jwtService.decode(token)
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token')
    }
    return decoded as ResetPasswordPayload
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
        return 3600 // default 1 hora
    }
  }
}
