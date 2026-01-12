import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserEntity, UserStatus } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Desactivar un usuario
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Cambiar status a INACTIVE
 * - Persistir cambios
 */
@Injectable()
export class ActivateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  @Transactional()
  async execute(id: string): Promise<UserEntity> {
    // 1. Verificar que el usuario existe
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    // 2. Cambiar status a ACTIVE
    user.status = UserStatus.ACTIVE

    // 3. Persistir cambios
    return await this.usersRepository.save(user)
  }
}
