import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { LoggerService } from '@core/logger'
import { CreateUserDto } from '../../dtos'
import { UserEntity } from '../../entities/user.entity'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { EmailVerificationService } from '../../services'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Crear un nuevo usuario
 *
 * SOLO para uso por ADMIN.
 *
 * Responsabilidades:
 * - Validar constraints únicas (email, username, CI)
 * - Validar que la organización existe
 * - Validar roles exclusivos
 * - Crear entidad de usuario con datos normalizados
 * - Persistir el usuario en la base de datos
 * - Enviar email de invitación automáticamente
 *
 * Flujo:
 * 1. Admin crea usuario → Usuario se crea con status=INACTIVE
 * 2. Sistema envía email de invitación automáticamente
 * 3. Usuario recibe email y verifica su cuenta
 * 4. Usuario pasa a status=ACTIVE
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
    private readonly userFactory: UserFactory,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly logger: LoggerService,
  ) {}

  @Transactional()
  async execute(dto: CreateUserDto): Promise<UserEntity> {
    // 1. Validaciones
    this.validator.validateRoles(dto.roles)
    await this.validator.validateUniqueConstraints(
      dto.email,
      dto.username,
      dto.ci,
    )
    await this.validator.validateOrganizationExists(dto.organizationId)

    // 2. Crear usuario (status = INACTIVE por defecto)
    const user = await this.userFactory.createFromDto(dto)
    const savedUser = await this.usersRepository.save(user)

    // 3. Enviar email de invitación automáticamente
    try {
      await this.emailVerificationService.generateAndSendInvitation(
        savedUser.id,
      )
      this.logger.log(
        `Email de invitación enviado a ${savedUser.email} (userId: ${savedUser.id})`,
      )
    } catch (error) {
      this.logger.error(
        `Error al enviar email de invitación a ${savedUser.email}:`,
        error instanceof Error ? error.stack : String(error),
      )
    }

    return savedUser
  }
}
