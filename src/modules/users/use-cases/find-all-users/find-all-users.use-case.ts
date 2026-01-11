import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Obtener todos los usuarios
 */
@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(): Promise<UserEntity[]> {
    return await this.usersRepository.findAll()
  }
}
