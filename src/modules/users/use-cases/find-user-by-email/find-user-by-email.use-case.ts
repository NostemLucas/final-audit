import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../repositories'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Buscar un usuario por email
 */
@Injectable()
export class FindUserByEmailUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(email: string): Promise<UserEntity> {
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      throw new UserNotFoundException(email, 'Email')
    }

    return user
  }
}
