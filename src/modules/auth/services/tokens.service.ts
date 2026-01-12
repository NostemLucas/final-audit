import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import type * as ms from 'ms'
import { REDIS_CLIENT } from '@core/cache'
import type { JwtPayload, JwtRefreshPayload } from '../interfaces'
import type { UserEntity } from '../../users/entities/user.entity'

/**
 * Servicio de gestión de tokens JWT
 *
 * Responsabilidades:
 * - Generar pares de tokens (access + refresh)
 * - Almacenar refresh tokens en Redis
 * - Validar tokens contra Redis
 * - Revocar tokens (blacklist)
 * - Token rotation en refresh
 */
@Injectable()
export class TokensService {
  private readonly accessTokenExpiry: string
  private readonly refreshTokenExpiry: string
  private readonly refreshTokenSecret: string

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.accessTokenExpiry = configService.get('JWT_EXPIRES_IN', '15m')
    this.refreshTokenExpiry = configService.get('JWT_REFRESH_EXPIRES_IN', '7d')

    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET')
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required in environment variables')
    }
    this.refreshTokenSecret = refreshSecret
  }

  /**
   * Genera un par de tokens (access + refresh) para un usuario
   *
   * @param user - Entidad del usuario
   * @returns Par de tokens: {accessToken, refreshToken}
   */
  async generateTokenPair(
    user: UserEntity,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenId = uuidv4() // ID único para tracking de rotation

    // Access Token (corta duración, en Authorization header)
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      organizationId: user.organizationId,
    }

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.accessTokenExpiry as ms.StringValue,
    })

    // Refresh Token (larga duración, en HTTP-only cookie)
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenId,
    }

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiry as ms.StringValue,
    })

    // Almacenar refresh token en Redis con TTL
    await this.storeRefreshToken(
      user.id,
      tokenId,
      this.getExpirySeconds(this.refreshTokenExpiry),
    )

    return { accessToken, refreshToken }
  }

  /**
   * Almacena un refresh token en Redis
   *
   * @param userId - ID del usuario
   * @param tokenId - ID único del token
   * @param ttlSeconds - Tiempo de vida en segundos
   */
  private async storeRefreshToken(
    userId: string,
    tokenId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`
    // Guardamos timestamp de creación como valor
    await this.redis.setex(key, ttlSeconds, Date.now().toString())
  }

  /**
   * Valida si un refresh token existe en Redis (no ha sido revocado)
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @returns true si el token es válido (existe en Redis)
   */
  async validateRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<boolean> {
    const key = `refresh_token:${userId}:${tokenId}`
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  /**
   * Revoca un refresh token (lo elimina de Redis)
   * Usado en logout y rotation
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`
    await this.redis.del(key)
  }

  /**
   * Agrega un access token a la blacklist
   * Usado en logout para invalidar tokens antes de su expiración natural
   *
   * @param token - Access token a blacklistear
   * @param userId - ID del usuario (para logging)
   */
  async blacklistAccessToken(token: string, userId: string): Promise<void> {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token)

      // Verificar que exp existe antes de usar
      if (!decoded.exp) {
        return // Token sin expiración, no es necesario blacklistear
      }

      const expiryTime = decoded.exp * 1000 // convertir a milliseconds
      const now = Date.now()
      const ttlSeconds = Math.floor((expiryTime - now) / 1000)

      // Solo blacklistear si aún no ha expirado
      if (ttlSeconds > 0) {
        const key = `blacklist:${token}`
        await this.redis.setex(key, ttlSeconds, userId)
      }
    } catch {
      // Token ya expirado o inválido, no es necesario blacklistear
    }
  }

  /**
   * Verifica si un access token está en la blacklist
   *
   * @param token - Access token a verificar
   * @returns true si el token está revocado
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * Útil para "cerrar todas las sesiones" o cuando se cambia la contraseña
   *
   * @param userId - ID del usuario
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  /**
   * Decodifica un refresh token sin verificar la firma
   * Útil para extraer el tokenId antes de la validación completa
   *
   * @param token - Refresh token a decodificar
   * @returns Payload decodificado
   */
  decodeRefreshToken(token: string): JwtRefreshPayload {
    const decoded = this.jwtService.decode(token)
    // decode() puede devolver null, string o object
    // Asumimos que es un JwtRefreshPayload válido si existe
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token inválido')
    }
    return decoded as JwtRefreshPayload
  }

  /**
   * Convierte un string de expiración (ej: "15m", "7d") a segundos
   *
   * @param expiryString - String de expiración (15m, 1h, 7d, etc.)
   * @returns Tiempo en segundos
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
        return 900 // default 15 minutos
    }
  }
}
