import { Injectable, Inject } from '@nestjs/common'
import { UserEntity } from '../../entities/user.entity'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Buscar usuarios por organización
 */
@Injectable()
export class FindUsersByOrganizationUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(organizationId: string): Promise<UserEntity[]> {
    return await this.usersRepository.findByOrganization(organizationId)
  }
}
