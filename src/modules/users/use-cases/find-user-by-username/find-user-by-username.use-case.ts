import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../repositories'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Buscar un usuario por username
 */
@Injectable()
export class FindUserByUsernameUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(username: string): Promise<UserEntity> {
    const user = await this.usersRepository.findByUsername(username)

    if (!user) {
      throw new UserNotFoundException(username, 'Username')
    }

    return user
  }
}
