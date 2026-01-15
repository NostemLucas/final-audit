import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserEntity, UserStatus } from '../../entities/user.entity'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'
import { EmailVerificationService } from '../../services'

/**
 * Caso de uso: Verificar email de usuario
 *
 * Responsabilidades:
 * - Validar token de verificación
 * - Marcar email como verificado
 * - Activar usuario (cambiar status a ACTIVE)
 *
 * Flujo:
 * 1. Usuario recibe email de invitación con link: /verify-email?token=<tokenId>
 * 2. Usuario hace clic y llega a este endpoint
 * 3. Validamos token, activamos usuario
 *
 * IMPORTANTE: El token se revoca automáticamente al consumirlo (one-time use)
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Verifica el email de un usuario usando un token de invitación
   *
   * @param tokenId - Token UUID enviado por email
   * @returns Usuario verificado y activado
   * @throws {BadRequestException} Si el token es inválido o expiró
   */
  @Transactional()
  async execute(tokenId: string): Promise<UserEntity> {
    // 1. Consumir token (busca, valida y revoca automáticamente)
    const tokenData =
      await this.emailVerificationService.consumeToken(tokenId)

    if (!tokenData) {
      throw new BadRequestException(
        'Token de verificación inválido o expirado. Por favor, contacte al administrador para que le reenvíe la invitación.',
      )
    }

    const { userId } = tokenData

    // 2. Buscar usuario
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      throw new BadRequestException('Usuario no encontrado')
    }

    // 3. Verificar si ya está verificado (evitar doble procesamiento)
    if (user.emailVerified) {
      return user // Ya estaba verificado
    }

    // 4. Marcar como verificado y activar
    user.emailVerified = true
    user.emailVerifiedAt = new Date()
    user.status = UserStatus.ACTIVE

    // 5. Guardar cambios
    return await this.usersRepository.save(user)
  }
}

