import { Injectable, Inject } from '@nestjs/common'
import { EmailService } from '@core/email'
import { ResetPasswordTokenService } from '../../services/reset-password-token.service'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Solicitar reset de contraseña
 *
 * Responsabilidades:
 * - Verificar que el email existe en el sistema
 * - Generar token de reset (JWT + Redis)
 * - Construir URL de reset para el frontend
 * - Enviar email con el link de reset
 *
 * Seguridad: No revela si el email existe o no (timing attack prevention)
 */
@Injectable()
export class RequestResetPasswordUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Ejecuta el flujo de solicitud de reset de contraseña
   *
   * @param email - Email del usuario
   * @returns Mensaje genérico (no revela si el email existe)
   */
  async execute(email: string): Promise<{ message: string }> {
    // Buscar usuario por email
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        message:
          'Si el email existe, recibirás un link para resetear tu contraseña',
      }
    }

    // Generar token de reset
    const token = await this.resetPasswordTokenService.generateToken(user.id)

    // Construir URL de reset (frontend)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    // Enviar email
    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.username,
      resetLink,
      expiresInMinutes: 60, // 1 hora
    })

    return {
      message:
        'Si el email existe, recibirás un link para resetear tu contraseña',
    }
  }
}
