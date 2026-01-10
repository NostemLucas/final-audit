import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { CreateUserDto } from '../../dtos'
import { UserEntity } from '../../entities/user.entity'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { USERS_REPOSITORY } from '../../repositories'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Crear un nuevo usuario
 *
 * Responsabilidades:
 * - Validar constraints únicas (email, username, CI)
 * - Validar que la organización existe
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
    // 1. Validar constraints únicas en paralelo
    await this.validator.validateUniqueConstraints(
      dto.email,
      dto.username,
      dto.ci,
    )

    // 2. Validar que la organización existe
    await this.validator.validateOrganizationExists(dto.organizationId)

    // 3. Crear usuario usando factory (normaliza datos y hashea password)
    const user = this.userFactory.createFromDto(dto)

    // 4. Persistir usuario
    return await this.usersRepository.save(user)
  }
}
