import { Injectable, Inject } from '@nestjs/common'
import type Redis from 'ioredis'
import { REDIS_CLIENT } from '@core/cache'

/**
 * Rate Limit Service
 *
 * Servicio genérico para implementar rate limiting usando Redis
 * Útil para prevenir ataques de fuerza bruta en:
 * - Login attempts
 * - Password reset attempts
 * - 2FA code validation
 * - API endpoints
 *
 * Implementa ventanas deslizantes con TTL automático
 */
@Injectable()
export class RateLimitService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  /**
   * Verifica si se puede realizar un intento más
   *
   * @param key - Clave única para el rate limit (ej: "login:ip:192.168.1.1")
   * @param maxAttempts - Número máximo de intentos permitidos
   * @param windowMinutes - Ventana de tiempo en minutos
   * @returns true si puede intentar, false si excedió el límite
   *
   * @example
   * ```typescript
   * const canAttempt = await rateLimitService.checkLimit(
   *   'login:ip:192.168.1.1',
   *   5,  // máximo 5 intentos
   *   15  // en 15 minutos
   * )
   * ```
   */
  async checkLimit(
    key: string,
    maxAttempts: number,
    windowMinutes: number,
  ): Promise<boolean> {
    const attempts = await this.getAttempts(key)

    if (attempts >= maxAttempts) {
      // Verificar si la ventana ya expiró
      const ttl = await this.getTimeUntilReset(key)

      if (ttl <= 0) {
        // Ventana expiró, resetear contador
        await this.resetAttempts(key)
        return true
      }

      return false
    }

    return true
  }

  /**
   * Incrementa el contador de intentos
   *
   * @param key - Clave única para el rate limit
   * @param windowMinutes - Ventana de tiempo en minutos
   * @returns Número de intentos actuales
   *
   * @example
   * ```typescript
   * const attempts = await rateLimitService.incrementAttempts(
   *   'login:user:john@example.com',
   *   15
   * )
   * console.log(`Intento ${attempts} de 5`)
   * ```
   */
  async incrementAttempts(key: string, windowMinutes: number): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key)
    const currentAttempts = await this.getAttempts(key)
    const newAttempts = currentAttempts + 1

    // Guardar con TTL en segundos
    const ttlSeconds = windowMinutes * 60
    await this.redis.setex(prefixedKey, ttlSeconds, newAttempts.toString())

    return newAttempts
  }

  /**
   * Obtiene el número de intentos actuales
   *
   * @param key - Clave única para el rate limit
   * @returns Número de intentos (0 si no existe)
   */
  async getAttempts(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key)
    const value = await this.redis.get(prefixedKey)

    if (!value) {
      return 0
    }

    return parseInt(value, 10) || 0
  }

  /**
   * Resetea el contador de intentos
   *
   * Útil después de un intento exitoso
   *
   * @param key - Clave única para el rate limit
   *
   * @example
   * ```typescript
   * // Login exitoso, resetear intentos
   * await rateLimitService.resetAttempts('login:user:john@example.com')
   * ```
   */
  async resetAttempts(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key)
    await this.redis.del(prefixedKey)
  }

  /**
   * Obtiene los intentos restantes
   *
   * @param key - Clave única para el rate limit
   * @param maxAttempts - Número máximo de intentos permitidos
   * @returns Número de intentos restantes
   *
   * @example
   * ```typescript
   * const remaining = await rateLimitService.getRemainingAttempts(
   *   'login:user:john@example.com',
   *   5
   * )
   * console.log(`Te quedan ${remaining} intentos`)
   * ```
   */
  async getRemainingAttempts(
    key: string,
    maxAttempts: number,
  ): Promise<number> {
    const currentAttempts = await this.getAttempts(key)
    return Math.max(0, maxAttempts - currentAttempts)
  }

  /**
   * Obtiene el tiempo restante hasta que expire el bloqueo
   *
   * @param key - Clave única para el rate limit
   * @returns Segundos restantes (0 si no hay bloqueo)
   *
   * @example
   * ```typescript
   * const ttl = await rateLimitService.getTimeUntilReset('login:user:john@example.com')
   * console.log(`Bloqueado por ${ttl} segundos`)
   * ```
   */
  async getTimeUntilReset(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key)
    const ttl = await this.redis.ttl(prefixedKey)

    // ttl retorna -2 si la clave no existe, -1 si no tiene expiración
    return Math.max(0, ttl)
  }

  /**
   * Agrega prefijo "rate-limit:" a la clave
   * Previene colisiones con otras claves en Redis
   */
  private getPrefixedKey(key: string): string {
    return `rate-limit:${key}`
  }
}
