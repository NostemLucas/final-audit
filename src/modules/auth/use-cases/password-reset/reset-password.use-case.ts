import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PasswordHashService } from '@core/security'
import { ResetPasswordTokenService } from '../../services/reset-password-token.service'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'

/**
 * Use Case: Resetear contraseña con token
 *
 * Responsabilidades:
 * - Validar el token de reset (JWT + Redis)
 * - Verificar que el usuario existe
 * - Hashear la nueva contraseña
 * - Actualizar la contraseña en la base de datos
 * - Revocar el token usado (un solo uso)
 * - Revocar todos los refresh tokens del usuario (cerrar sesiones)
 *
 * Seguridad:
 * - Token de un solo uso (se elimina de Redis después de usarse)
 * - Cierra todas las sesiones activas por seguridad
 * - Nueva contraseña debe cumplir requisitos de complejidad (validado en DTO)
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  /**
   * Ejecuta el flujo de reset de contraseña
   *
   * @param token - Token de reset (del email)
   * @param newPassword - Nueva contraseña (validada por DTO)
   * @returns Mensaje de confirmación
   * @throws BadRequestException si el token es inválido o expirado
   * @throws NotFoundException si el usuario no existe
   */
  async execute(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 1. Validar token
    const userId = await this.resetPasswordTokenService.validateToken(token)

    if (!userId) {
      throw new BadRequestException('Token inválido o expirado')
    }

    // 2. Buscar usuario
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // 3. Hash de la nueva contraseña
    const hashedPassword = await this.passwordHashService.hash(newPassword)

    // 4. Actualizar contraseña
    await this.usersRepository.update(user.id, { password: hashedPassword })

    // 5. Revocar token usado (un solo uso)
    await this.resetPasswordTokenService.revokeToken(token)

    // 6. Revocar todos los refresh tokens (seguridad: cerrar todas las sesiones)
    await this.resetPasswordTokenService.revokeUserTokens(userId)

    return {
      message: 'Contraseña actualizada exitosamente',
    }
  }
}
