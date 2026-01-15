import { Injectable } from '@nestjs/common'
import { EmailVerificationService } from '../../services'

/**
 * Caso de uso: Re-enviar invitación de verificación de email
 *
 * SOLO para uso por ADMIN.
 *
 * Escenarios:
 * - El token de invitación expiró (> 24h)
 * - Usuario no recibió el email
 * - Usuario eliminó el email por error
 *
 * Responsabilidades:
 * - Validar que el usuario existe y no está verificado
 * - Revocar tokens anteriores
 * - Generar nuevo token
 * - Enviar email de invitación
 *
 * IMPORTANTE: Este use case NO valida permisos. Eso debe hacerse
 * en el controlador con un guard @Roles(Role.ADMIN)
 */
@Injectable()
export class ResendInvitationUseCase {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Re-envía invitación de verificación a un usuario
   *
   * @param userId - ID del usuario
   * @returns Información del envío (tokenId y email)
   * @throws {NotFoundException} Si el usuario no existe
   * @throws {BadRequestException} Si el email ya está verificado
   */
  async execute(userId: string): Promise<{
    tokenId: string
    email: string
    message: string
  }> {
    // Delegar toda la lógica al servicio
    const result =
      await this.emailVerificationService.generateAndSendInvitation(userId)

    return {
      ...result,
      message: 'Invitación de verificación enviada exitosamente',
    }
  }
}
