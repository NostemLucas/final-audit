import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { EmailService } from '@core/email'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Generar código 2FA
 *
 * Responsabilidades:
 * - Buscar usuario por email o ID
 * - Generar código numérico de 6 dígitos
 * - Almacenar código en Redis con TTL
 * - Enviar código por email
 * - Devolver token JWT para validación posterior
 *
 * El token JWT sirve para vincular el código con la sesión del usuario
 */
@Injectable()
export class Generate2FACodeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly twoFactorTokenService: TwoFactorTokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Ejecuta el flujo de generación de código 2FA
   *
   * @param identifier - Email o userId del usuario
   * @returns Token JWT y mensaje de confirmación
   * @throws NotFoundException si el usuario no existe
   */
  async execute(
    identifier: string,
  ): Promise<{ token: string; message: string }> {
    // Buscar usuario por email o ID
    let user = await this.usersRepository.findByEmail(identifier)

    if (!user) {
      user = await this.usersRepository.findById(identifier)
    }

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Generar código 2FA
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5, // 5 minutos
    })

    return {
      token,
      message: 'Código 2FA enviado al email registrado',
    }
  }
}
