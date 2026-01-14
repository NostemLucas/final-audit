import { Injectable } from '@nestjs/common'
import { RateLimitService } from '@core/security'
import { CACHE_KEYS } from '@core/cache'
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config'
import { TooManyAttemptsException } from '../exceptions'

/**
 * Policy: Rate Limiting para Login
 *
 * Responsabilidades:
 * - Verificar límites por IP (previene ataques distribuidos desde una IP)
 * - Verificar límites por usuario (previene ataques dirigidos a una cuenta)
 * - Incrementar contadores en intentos fallidos
 * - Resetear contadores en login exitoso
 *
 * Límites configurables:
 * - Por IP: 10 intentos en 15 minutos
 * - Por usuario: 5 intentos en 15 minutos
 */
@Injectable()
export class LoginRateLimitPolicy {
  private readonly maxAttemptsByIp = RATE_LIMIT_CONFIG.login.maxAttemptsByIp
  private readonly maxAttemptsByUser = RATE_LIMIT_CONFIG.login.maxAttemptsByUser
  private readonly windowMinutes = RATE_LIMIT_CONFIG.login.windowMinutes

  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Verifica ambos límites (IP y usuario)
   *
   * @param ip - Dirección IP del usuario
   * @param userIdentifier - Email o username del usuario
   * @throws TooManyAttemptsException si excede algún límite
   */
  async checkLimits(ip: string, userIdentifier: string): Promise<void> {
    await this.checkIpLimit(ip)
    await this.checkUserLimit(userIdentifier)
  }

  /**
   * Verifica límite por IP
   *
   * @param ip - Dirección IP
   * @throws TooManyAttemptsException si excede el límite
   */
  async checkIpLimit(ip: string): Promise<void> {
    const key = CACHE_KEYS.LOGIN_ATTEMPTS_IP(ip)
    const canAttempt = await this.rateLimitService.checkLimit(
      key,
      this.maxAttemptsByIp,
      this.windowMinutes,
    )

    if (!canAttempt) {
      const remaining = await this.rateLimitService.getTimeUntilReset(key)
      throw new TooManyAttemptsException(
        `Demasiados intentos desde esta IP. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }
  }

  /**
   * Verifica límite por usuario (email/username)
   *
   * @param userIdentifier - Email o username
   * @throws TooManyAttemptsException si excede el límite
   */
  async checkUserLimit(userIdentifier: string): Promise<void> {
    const normalizedIdentifier = userIdentifier.toLowerCase()
    const key = CACHE_KEYS.LOGIN_ATTEMPTS_USER(normalizedIdentifier)
    const canAttempt = await this.rateLimitService.checkLimit(
      key,
      this.maxAttemptsByUser,
      this.windowMinutes,
    )

    if (!canAttempt) {
      const remaining = await this.rateLimitService.getTimeUntilReset(key)
      throw new TooManyAttemptsException(
        `Demasiados intentos fallidos para este usuario. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }
  }

  /**
   * Incrementa contadores en intento fallido
   *
   * @param ip - Dirección IP
   * @param userIdentifier - Email o username
   */
  async incrementAttempts(ip: string, userIdentifier: string): Promise<void> {
    const normalizedIdentifier = userIdentifier.toLowerCase()
    const ipKey = CACHE_KEYS.LOGIN_ATTEMPTS_IP(ip)
    const userKey = CACHE_KEYS.LOGIN_ATTEMPTS_USER(normalizedIdentifier)

    await Promise.all([
      this.rateLimitService.incrementAttempts(ipKey, this.windowMinutes),
      this.rateLimitService.incrementAttempts(userKey, this.windowMinutes),
    ])
  }

  /**
   * Resetea contadores en login exitoso
   *
   * @param ip - Dirección IP
   * @param userIdentifier - Email o username
   */
  async resetAttempts(ip: string, userIdentifier: string): Promise<void> {
    const normalizedIdentifier = userIdentifier.toLowerCase()
    const ipKey = CACHE_KEYS.LOGIN_ATTEMPTS_IP(ip)
    const userKey = CACHE_KEYS.LOGIN_ATTEMPTS_USER(normalizedIdentifier)

    await Promise.all([
      this.rateLimitService.resetAttempts(ipKey),
      this.rateLimitService.resetAttempts(userKey),
    ])
  }
}
