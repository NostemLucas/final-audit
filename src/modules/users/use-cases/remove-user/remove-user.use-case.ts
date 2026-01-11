import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserValidator } from '../../validators/user.validator'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Eliminar un usuario (soft delete)
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Realizar soft delete (marca deletedAt)
 */
@Injectable()
export class RemoveUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
  ) {}

  @Transactional()
  async execute(id: string): Promise<void> {
    // 1. Verificar que el usuario existe
    await this.validator.ensureUserExists(id)

    // 2. Soft delete
    await this.usersRepository.softDelete(id)
  }
}
