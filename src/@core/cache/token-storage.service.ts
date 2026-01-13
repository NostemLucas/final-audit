import { Injectable, Inject } from '@nestjs/common'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { REDIS_CLIENT } from './cache.module'

export interface TokenStorageOptions {
  prefix: string
  ttlSeconds?: number
  generateTokenId?: () => string
}

export interface StoredTokenData {
  tokenId: string
  userId: string
  createdAt: number
  metadata?: Record<string, unknown>
}

/**
 * Servicio genérico para almacenar y gestionar tokens temporales en Redis
 *
 * Proporciona una interfaz estandarizada para:
 * - Almacenar tokens con TTL
 * - Validar existencia de tokens
 * - Revocar tokens individuales o por usuario
 * - Gestionar metadata adicional
 *
 * Usado como base para:
 * - Refresh tokens
 * - Reset password tokens
 * - 2FA codes
 * - Otros tokens temporales
 */
@Injectable()
export class TokenStorageService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Almacena un token en Redis con TTL
   *
   * @param userId - ID del usuario dueño del token
   * @param tokenId - ID único del token (auto-generado si no se provee)
   * @param options - Opciones de configuración
   * @returns ID del token almacenado
   */
  async storeToken(
    userId: string,
    tokenId: string,
    options: TokenStorageOptions,
  ): Promise<string> {
    const key = this.buildKey(options.prefix, userId, tokenId)
    const data: StoredTokenData = {
      tokenId,
      userId,
      createdAt: Date.now(),
      metadata: {},
    }

    const ttl = options.ttlSeconds ?? 900 // default 15 minutos
    await this.redis.setex(key, ttl, JSON.stringify(data))

    return tokenId
  }

  /**
   * Almacena un token con metadata adicional
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param metadata - Datos adicionales a almacenar
   * @param options - Opciones de configuración
   */
  async storeTokenWithMetadata(
    userId: string,
    tokenId: string,
    metadata: Record<string, unknown>,
    options: TokenStorageOptions,
  ): Promise<string> {
    const key = this.buildKey(options.prefix, userId, tokenId)
    const data: StoredTokenData = {
      tokenId,
      userId,
      createdAt: Date.now(),
      metadata,
    }

    const ttl = options.ttlSeconds ?? 900
    await this.redis.setex(key, ttl, JSON.stringify(data))

    return tokenId
  }

  /**
   * Valida si un token existe en Redis
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param prefix - Prefijo de la llave
   * @returns true si el token existe y es válido
   */
  async validateToken(
    userId: string,
    tokenId: string,
    prefix: string,
  ): Promise<boolean> {
    const key = this.buildKey(prefix, userId, tokenId)
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  /**
   * Obtiene los datos de un token almacenado
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param prefix - Prefijo de la llave
   * @returns Datos del token o null si no existe
   */
  async getTokenData(
    userId: string,
    tokenId: string,
    prefix: string,
  ): Promise<StoredTokenData | null> {
    const key = this.buildKey(prefix, userId, tokenId)
    const data = await this.redis.get(key)

    if (!data) {
      return null
    }

    return JSON.parse(data)
  }

  /**
   * Revoca un token específico (lo elimina de Redis)
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param prefix - Prefijo de la llave
   */
  async revokeToken(
    userId: string,
    tokenId: string,
    prefix: string,
  ): Promise<void> {
    const key = this.buildKey(prefix, userId, tokenId)
    await this.redis.del(key)
  }

  /**
   * Revoca todos los tokens de un usuario con un prefijo específico
   *
   * @param userId - ID del usuario
   * @param prefix - Prefijo de la llave
   * @returns Número de tokens revocados
   */
  async revokeAllUserTokens(userId: string, prefix: string): Promise<number> {
    const pattern = `${prefix}:${userId}:*`
    const keys = await this.redis.keys(pattern)

    if (keys.length === 0) {
      return 0
    }

    await this.redis.del(...keys)
    return keys.length
  }

  /**
   * Actualiza el TTL de un token existente
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param prefix - Prefijo de la llave
   * @param ttlSeconds - Nuevo TTL en segundos
   */
  async refreshTokenTTL(
    userId: string,
    tokenId: string,
    prefix: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const key = this.buildKey(prefix, userId, tokenId)
    const result = await this.redis.expire(key, ttlSeconds)
    return result === 1
  }

  /**
   * Obtiene el TTL restante de un token
   *
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @param prefix - Prefijo de la llave
   * @returns TTL en segundos, -1 si no tiene TTL, -2 si no existe
   */
  async getTokenTTL(
    userId: string,
    tokenId: string,
    prefix: string,
  ): Promise<number> {
    const key = this.buildKey(prefix, userId, tokenId)
    return await this.redis.ttl(key)
  }

  /**
   * Lista todos los tokens activos de un usuario
   *
   * @param userId - ID del usuario
   * @param prefix - Prefijo de la llave
   * @returns Lista de IDs de tokens activos
   */
  async listUserTokens(userId: string, prefix: string): Promise<string[]> {
    const pattern = `${prefix}:${userId}:*`
    const keys = await this.redis.keys(pattern)

    // Extraer tokenIds de las llaves
    return keys.map((key) => {
      const parts = key.split(':')
      return parts[parts.length - 1]
    })
  }

  /**
   * Genera un ID único para un token
   *
   * @returns UUID v4
   */
  generateTokenId(): string {
    return uuidv4()
  }

  /**
   * Construye la llave de Redis
   *
   * @param prefix - Prefijo (ej: "auth:refresh")
   * @param userId - ID del usuario
   * @param tokenId - ID del token
   * @returns Llave formateada
   */
  private buildKey(prefix: string, userId: string, tokenId: string): string {
    return `${prefix}:${userId}:${tokenId}`
  }

  /**
   * Almacena un valor simple con TTL (útil para blacklists)
   *
   * @param key - Llave completa
   * @param value - Valor a almacenar
   * @param ttlSeconds - TTL en segundos
   */
  async storeSimple(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, value)
  }

  /**
   * Verifica si una llave existe
   *
   * @param key - Llave completa
   * @returns true si existe
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key)
    return result === 1
  }

  /**
   * Elimina una llave simple
   *
   * @param key - Llave a eliminar
   */
  async deleteSimple(key: string): Promise<void> {
    await this.redis.del(key)
  }
}
