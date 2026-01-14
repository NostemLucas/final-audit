import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { FilesService } from '@core/files'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Eliminar imagen de perfil de usuario
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Eliminar imagen física del storage
 * - Actualizar usuario para remover referencia a imagen
 */
@Injectable()
export class DeleteProfileImageUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly filesService: FilesService,
  ) {}

  @Transactional()
  async execute(id: string): Promise<UserEntity> {
    // 1. Verificar que el usuario existe
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    // 2. Si tiene imagen, eliminarla del storage
    if (user.image) {
      await this.filesService.deleteFile(user.image)
    }

    // 3. Actualizar usuario removiendo referencia
    user.image = null
    return await this.usersRepository.save(user)
  }
}
