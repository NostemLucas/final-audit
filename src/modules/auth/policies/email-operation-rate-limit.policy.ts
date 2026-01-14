import { Injectable } from '@nestjs/common'
import { RateLimitService } from '@core/security'
import { CACHE_KEYS } from '@core/cache'
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config'
import { TooManyAttemptsException } from '../exceptions'

/**
 * Policy: Rate Limiting para operaciones de email
 *
 * Usado para:
 * - Solicitudes de reset de contraseña
 * - Generación de códigos 2FA
 * - Reenvío de códigos 2FA
 *
 * Responsabilidades:
 * - Prevenir spam de emails
 * - Proteger contra ataques de fuerza bruta
 * - Limitar intentos por IP
 *
 * Límites configurables:
 * - Reset password: 10 intentos por IP en 60 minutos
 * - 2FA: 5 intentos en 5 minutos
 */
@Injectable()
export class EmailOperationRateLimitPolicy {
  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Verifica límite para solicitudes de reset de contraseña
   *
   * @param ip - Dirección IP del usuario
   * @throws TooManyAttemptsException si excede el límite
   */
  async checkResetPasswordLimit(ip: string): Promise<void> {
    const key = CACHE_KEYS.RESET_PASSWORD_ATTEMPTS_IP(ip)
    const config = RATE_LIMIT_CONFIG.resetPassword
    const canAttempt = await this.rateLimitService.checkLimit(
      key,
      config.maxAttemptsByIp,
      config.windowMinutes,
    )

    if (!canAttempt) {
      const remaining = await this.rateLimitService.getTimeUntilReset(key)
      throw new TooManyAttemptsException(
        `Demasiadas solicitudes de reset de contraseña. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }
  }

  /**
   * Incrementa contador para reset de contraseña
   *
   * @param ip - Dirección IP
   */
  async incrementResetPasswordAttempt(ip: string): Promise<void> {
    const key = CACHE_KEYS.RESET_PASSWORD_ATTEMPTS_IP(ip)
    const config = RATE_LIMIT_CONFIG.resetPassword
    await this.rateLimitService.incrementAttempts(key, config.windowMinutes)
  }

  /**
   * Verifica límite para operaciones 2FA
   *
   * @param userId - ID del usuario
   * @param operation - Tipo de operación (generate, resend, verify)
   * @throws TooManyAttemptsException si excede el límite
   */
  async check2FALimit(
    userId: string,
    operation: 'generate' | 'resend' | 'verify',
  ): Promise<void> {
    const key = CACHE_KEYS.TWO_FACTOR_ATTEMPTS(userId, operation)
    const config = RATE_LIMIT_CONFIG.twoFactor
    const canAttempt = await this.rateLimitService.checkLimit(
      key,
      config.maxAttempts,
      config.windowMinutes,
    )

    if (!canAttempt) {
      const remaining = await this.rateLimitService.getTimeUntilReset(key)
      throw new TooManyAttemptsException(
        `Demasiados intentos de 2FA. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }
  }

  /**
   * Incrementa contador para operaciones 2FA
   *
   * @param userId - ID del usuario
   * @param operation - Tipo de operación
   */
  async increment2FAAttempt(
    userId: string,
    operation: 'generate' | 'resend' | 'verify',
  ): Promise<void> {
    const key = CACHE_KEYS.TWO_FACTOR_ATTEMPTS(userId, operation)
    const config = RATE_LIMIT_CONFIG.twoFactor
    await this.rateLimitService.incrementAttempts(key, config.windowMinutes)
  }

  /**
   * Resetea contador 2FA (útil después de verificación exitosa)
   *
   * @param userId - ID del usuario
   * @param operation - Tipo de operación
   */
  async reset2FAAttempt(
    userId: string,
    operation: 'generate' | 'resend' | 'verify',
  ): Promise<void> {
    const key = CACHE_KEYS.TWO_FACTOR_ATTEMPTS(userId, operation)
    await this.rateLimitService.resetAttempts(key)
  }
}
