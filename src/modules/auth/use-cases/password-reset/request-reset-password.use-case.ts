import { Injectable, Inject } from '@nestjs/common'
import { EmailService } from '@core/email'
import { ResetPasswordTokenService } from '../../services/reset-password-token.service'
import { EmailOperationRateLimitPolicy } from '../../policies'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Solicitar reset de contraseña
 *
 * Responsabilidades:
 * - Verificar rate limiting por IP (previene spam)
 * - Verificar que el email existe en el sistema
 * - Generar token de reset (JWT + Redis)
 * - Construir URL de reset para el frontend
 * - Enviar email con el link de reset
 *
 * Seguridad:
 * - Rate limiting: 10 intentos por IP en 60 minutos
 * - No revela si el email existe o no (timing attack prevention)
 */
@Injectable()
export class RequestResetPasswordUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
    private readonly emailService: EmailService,
    private readonly emailOperationRateLimitPolicy: EmailOperationRateLimitPolicy,
  ) {}

  /**
   * Ejecuta el flujo de solicitud de reset de contraseña
   *
   * @param email - Email del usuario
   * @param ip - Dirección IP (para rate limiting)
   * @returns Mensaje genérico (no revela si el email existe)
   * @throws TooManyAttemptsException si excede intentos
   */
  async execute(email: string, ip: string): Promise<{ message: string }> {
    // 1. Verificar rate limiting por IP
    await this.emailOperationRateLimitPolicy.checkResetPasswordLimit(ip)

    // 2. Buscar usuario por email
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      // Incrementar contador incluso si el usuario no existe
      // Esto previene enumerar emails válidos
      await this.emailOperationRateLimitPolicy.incrementResetPasswordAttempt(ip)

      // Por seguridad, no revelamos si el email existe o no
      return {
        message:
          'Si el email existe, recibirás un link para resetear tu contraseña',
      }
    }

    // 3. Generar token de reset
    const token = await this.resetPasswordTokenService.generateToken(user.id)

    // 4. Construir URL de reset (frontend)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    // 5. Enviar email
    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.username,
      resetLink,
      expiresInMinutes: 60, // 1 hora
    })

    // 6. Incrementar contador (previene spam de emails)
    await this.emailOperationRateLimitPolicy.incrementResetPasswordAttempt(ip)

    return {
      message:
        'Si el email existe, recibirás un link para resetear tu contraseña',
    }
  }
}
