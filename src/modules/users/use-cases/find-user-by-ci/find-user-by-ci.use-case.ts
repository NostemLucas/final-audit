import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Buscar un usuario por CI
 */
@Injectable()
export class FindUserByCIUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(ci: string): Promise<UserEntity> {
    const user = await this.usersRepository.findByCI(ci)

    if (!user) {
      throw new UserNotFoundException(ci, 'CI')
    }

    return user
  }
}
