import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { EmailService } from '@core/email'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'
import { EmailOperationRateLimitPolicy } from '../../policies'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Reenviar código 2FA
 *
 * Responsabilidades:
 * - Verificar rate limiting (previene spam de códigos)
 * - Verificar que el usuario existe
 * - Revocar códigos anteriores (si existen)
 * - Generar nuevo código
 * - Enviar código por email
 * - Devolver nuevo token JWT
 *
 * Seguridad:
 * - Rate limiting: 5 intentos en 5 minutos
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
    private readonly emailOperationRateLimitPolicy: EmailOperationRateLimitPolicy,
  ) {}

  /**
   * Ejecuta el flujo de reenvío de código 2FA
   *
   * @param userId - ID del usuario
   * @returns Nuevo token JWT y mensaje de confirmación
   * @throws NotFoundException si el usuario no existe
   * @throws TooManyAttemptsException si excede intentos
   */
  async execute(userId: string): Promise<{ token: string; message: string }> {
    // 1. Buscar usuario
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // 2. Verificar rate limiting
    await this.emailOperationRateLimitPolicy.check2FALimit(userId, 'resend')

    // 3. Revocar códigos anteriores
    await this.twoFactorTokenService.revokeAllUserCodes(userId)

    // 4. Generar nuevo código
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // 5. Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5,
    })

    // 6. Incrementar contador
    await this.emailOperationRateLimitPolicy.increment2FAAttempt(
      userId,
      'resend',
    )

    return {
      token,
      message: 'Nuevo código 2FA enviado',
    }
  }
}
