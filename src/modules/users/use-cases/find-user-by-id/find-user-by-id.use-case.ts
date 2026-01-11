import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Buscar un usuario por ID
 *
 * Responsabilidades:
 * - Buscar usuario por ID
 * - Lanzar excepción si no existe
 */
@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new UserNotFoundException(id)
    }

    return user
  }
}
