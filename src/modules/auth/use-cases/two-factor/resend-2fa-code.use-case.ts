import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { EmailService } from '@core/email'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Reenviar código 2FA
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Revocar códigos anteriores (si existen)
 * - Generar nuevo código
 * - Enviar código por email
 * - Devolver nuevo token JWT
 *
 * Seguridad:
 * - Revoca códigos anteriores para evitar que se use el viejo
 * - Genera nuevo código con nueva expiración
 */
@Injectable()
export class Resend2FACodeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly twoFactorTokenService: TwoFactorTokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Ejecuta el flujo de reenvío de código 2FA
   *
   * @param userId - ID del usuario
   * @returns Nuevo token JWT y mensaje de confirmación
   * @throws NotFoundException si el usuario no existe
   */
  async execute(userId: string): Promise<{ token: string; message: string }> {
    // Buscar usuario
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Revocar códigos anteriores
    await this.twoFactorTokenService.revokeAllUserCodes(userId)

    // Generar nuevo código
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5,
    })

    return {
      token,
      message: 'Nuevo código 2FA enviado',
    }
  }
}
