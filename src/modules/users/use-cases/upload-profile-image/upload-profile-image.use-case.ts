import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { FilesService, FileType } from '@core/files'
import { UserEntity } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Subir imagen de perfil de usuario
 *
 * Responsabilidades:
 * - Verificar que el usuario existe
 * - Reemplazar imagen anterior si existe
 * - Validar formato y tamaño de imagen
 * - Actualizar URL de imagen en usuario
 */
@Injectable()
export class UploadProfileImageUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly filesService: FilesService,
  ) {}

  @Transactional()
  async execute(id: string, file: Express.Multer.File): Promise<UserEntity> {
    // 1. Verificar que el usuario existe
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new UserNotFoundException(id)
    }

    // 2. Subir nueva imagen (reemplaza la anterior si existe)
    const uploadResult = await this.filesService.replaceFile(user.image, {
      file,
      folder: 'users/profiles',
      customFileName: `user-${id}`,
      overwrite: true,
      validationOptions: {
        fileType: FileType.IMAGE,
        maxSize: 2 * 1024 * 1024, // 2MB
        maxWidth: 800,
        maxHeight: 800,
      },
    })

    // 3. Actualizar usuario con nueva URL
    user.image = uploadResult.filePath
    return await this.usersRepository.save(user)
  }
}
