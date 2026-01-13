import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UpdateUserDto } from '../../dtos'
import { UserEntity } from '../../entities/user.entity'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Actualizar un usuario existente
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Validar constraints únicas solo si cambiaron
 * - Validar organización solo si cambió
 * - Actualizar entidad con datos normalizados
 * - Persistir cambios en la base de datos
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
    private readonly userFactory: UserFactory,
  ) {}

  @Transactional()
  async execute(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    // 1. Verificar que el usuario existe
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    // 2. Validar solo los campos que cambiaron
    const validations: Promise<void>[] = []

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      validations.push(this.validator.validateUniqueEmail(dto.email, id))
    }

    if (dto.username && dto.username.toLowerCase() !== user.username) {
      validations.push(this.validator.validateUniqueUsername(dto.username, id))
    }

    if (dto.ci && dto.ci !== user.ci) {
      validations.push(this.validator.validateUniqueCI(dto.ci, id))
    }

    if (dto.roles) {
      // Validar que los roles sean válidos y cumplan reglas básicas
      this.validator.validateRoles(dto.roles)

      // Validar transición de roles (CLIENTE no puede cambiar a otro rol)
      this.validator.validateRoleTransition(user, dto.roles)
    }
    // Ejecutar validaciones en paralelo
    if (validations.length > 0) {
      await Promise.all(validations)
    }

    // 3. Actualizar usuario usando factory (normaliza datos)
    const updatedUser = this.userFactory.updateFromDto(user, dto)

    // 4. Persistir cambios
    return await this.usersRepository.save(updatedUser)
  }
}
