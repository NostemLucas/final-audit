import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type * as ms from 'ms'
import { TokenStorageService, REDIS_PREFIXES, CACHE_KEYS } from '@core/cache'
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
 *
 * Usa TokenStorageService para operaciones de Redis estandarizadas
 */
@Injectable()
export class TokensService {
  private readonly accessTokenExpiry: string
  private readonly refreshTokenExpiry: string
  private readonly refreshTokenSecret: string

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStorage: TokenStorageService,
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
    const tokenId = this.tokenStorage.generateTokenId()

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
    await this.tokenStorage.storeToken(user.id, tokenId, {
      prefix: REDIS_PREFIXES.REFRESH_TOKEN,
      ttlSeconds: this.getExpirySeconds(this.refreshTokenExpiry),
    })

    return { accessToken, refreshToken }
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
    return await this.tokenStorage.validateToken(
      userId,
      tokenId,
      REDIS_PREFIXES.REFRESH_TOKEN,
    )
  }

  /**
   * Revoca un refresh token (lo elimina de Redis)
   * Usado en logout y rotation
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.tokenStorage.revokeToken(
      userId,
      tokenId,
      REDIS_PREFIXES.REFRESH_TOKEN,
    )
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
        const key = CACHE_KEYS.BLACKLIST(token)
        await this.tokenStorage.storeSimple(key, userId, ttlSeconds)
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
    const key = CACHE_KEYS.BLACKLIST(token)
    return await this.tokenStorage.exists(key)
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * Útil para "cerrar todas las sesiones" o cuando se cambia la contraseña
   *
   * @param userId - ID del usuario
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenStorage.revokeAllUserTokens(
      userId,
      REDIS_PREFIXES.REFRESH_TOKEN,
    )
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
