import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { CreateUserDto } from '../../dtos'
import { UserEntity } from '../../entities/user.entity'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Crear un nuevo usuario
 *
 * Responsabilidades:
 * - Validar constraints únicas (email, username, CI)
 * - Validar que la organización existe
 * - Validar roles exclusivos
 * - Crear entidad de usuario con datos normalizados
 * - Persistir el usuario en la base de datos
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
    private readonly userFactory: UserFactory,
  ) {}

  @Transactional()
  async execute(dto: CreateUserDto): Promise<UserEntity> {
    this.validator.validateRoles(dto.roles)
    await this.validator.validateUniqueConstraints(
      dto.email,
      dto.username,
      dto.ci,
    )
    await this.validator.validateOrganizationExists(dto.organizationId)
    const user = this.userFactory.createFromDto(dto)
    return await this.usersRepository.save(user)
  }
}
