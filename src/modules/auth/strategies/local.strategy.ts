import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import type { Request } from 'express'
import { ValidateUserUseCase } from '../use-cases/validate-user/validate-user.use-case'
import type { UserEntity } from '../../users/entities/user.entity'

/**
 * Local Strategy (Passport) CON RATE LIMITING
 *
 * Maneja la autenticación con username/password
 * Usado en el endpoint de login
 *
 * IMPORTANTE: Extrae la IP del request para rate limiting
 *
 * @see ValidateUserUseCase
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly validateUserUseCase: ValidateUserUseCase) {
    super({
      usernameField: 'usernameOrEmail', // Campo del DTO
      passwordField: 'password',
      passReqToCallback: true, // ← CRITICAL: Permite acceder al request para extraer IP
    })
  }

  /**
   * Valida las credenciales del usuario CON RATE LIMITING
   *
   * Este método es llamado automáticamente por Passport
   * cuando se usa el LocalAuthGuard
   *
   * IMPORTANTE: Recibe el request como primer parámetro (passReqToCallback: true)
   *
   * @param req - Request de Express (para extraer IP)
   * @param usernameOrEmail - Email o username
   * @param password - Contraseña en texto plano
   * @returns Usuario validado
   * @throws TooManyAttemptsException si excede intentos
   */
  async validate(
    req: Request,
    usernameOrEmail: string,
    password: string,
  ): Promise<UserEntity> {
    // Extraer IP del request (considera proxy headers)
    const ip = this.extractIp(req)

    return await this.validateUserUseCase.execute(usernameOrEmail, password, ip)
  }

  /**
   * Extrae la IP real del request (considera proxies)
   *
   * Prioridad:
   * 1. X-Forwarded-For (si está detrás de un proxy/load balancer)
   * 2. X-Real-IP (alternativa común)
   * 3. req.ip (directo de Express)
   */
  private extractIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
      // X-Forwarded-For puede ser una lista: "client, proxy1, proxy2"
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0]
      return ips.trim()
    }

    const realIp = req.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') {
      return realIp.trim()
    }

    return req.ip || 'unknown'
  }
}
