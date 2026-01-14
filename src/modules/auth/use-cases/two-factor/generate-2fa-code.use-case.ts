import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { EmailService } from '@core/email'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'
import { EmailOperationRateLimitPolicy } from '../../policies'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Generar código 2FA
 *
 * Responsabilidades:
 * - Verificar rate limiting (previene spam de códigos)
 * - Buscar usuario por email o ID
 * - Generar código numérico de 6 dígitos
 * - Almacenar código en Redis con TTL
 * - Enviar código por email
 * - Devolver token JWT para validación posterior
 *
 * Seguridad:
 * - Rate limiting: 5 intentos en 5 minutos
 * - El token JWT sirve para vincular el código con la sesión del usuario
 */
@Injectable()
export class Generate2FACodeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly twoFactorTokenService: TwoFactorTokenService,
    private readonly emailService: EmailService,
    private readonly emailOperationRateLimitPolicy: EmailOperationRateLimitPolicy,
  ) {}

  /**
   * Ejecuta el flujo de generación de código 2FA
   *
   * @param identifier - Email o userId del usuario
   * @returns Token JWT y mensaje de confirmación
   * @throws NotFoundException si el usuario no existe
   * @throws TooManyAttemptsException si excede intentos
   */
  async execute(
    identifier: string,
  ): Promise<{ token: string; message: string }> {
    // 1. Buscar usuario por email o ID
    let user = await this.usersRepository.findByEmail(identifier)

    if (!user) {
      user = await this.usersRepository.findById(identifier)
    }

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // 2. Verificar rate limiting
    await this.emailOperationRateLimitPolicy.check2FALimit(user.id, 'generate')

    // 3. Generar código 2FA
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // 4. Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5, // 5 minutos
    })

    // 5. Incrementar contador
    await this.emailOperationRateLimitPolicy.increment2FAAttempt(
      user.id,
      'generate',
    )

    return {
      token,
      message: 'Código 2FA enviado al email registrado',
    }
  }
}
