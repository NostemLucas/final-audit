import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { TransactionService } from '@core/database'
import { FilesService, FileType } from '@core/files'
import { USERS_REPOSITORY } from '../repositories'
import type { IUsersRepository } from '../repositories'
import { UserValidator } from '../validators/user.validator'
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { UserNotFoundException } from '../exceptions'

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
    private readonly userFactory: UserFactory,
    private readonly transactionService: TransactionService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Crea un nuevo usuario
   * Valida unicidad de email, username y CI antes de crear
   * Hashea la contraseña automáticamente usando el UserFactory
   */
  @Transactional()
  async create(dto: CreateUserDto): Promise<UserEntity> {
    // Validar unicidad de email, username y CI
    await this.validator.validateUniqueConstraints(
      dto.email,
      dto.username,
      dto.ci,
    )

    // Crear usuario usando el factory (hashea la contraseña automáticamente)
    const user = this.userFactory.createFromDto(dto)

    // Guardar en BD
    return await this.usersRepository.save(user)
  }

  /**
   * Lista todos los usuarios
   */
  async findAll(): Promise<UserEntity[]> {
    return await this.usersRepository.findAll()
  }

  /**
   * Busca un usuario por ID
   * @throws UserNotFoundException si no se encuentra
   */
  async findOne(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new UserNotFoundException(id)
    }

    return user
  }

  /**
   * Busca un usuario por email
   * @returns Usuario o null si no existe
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByEmail(email)
  }

  /**
   * Busca un usuario por username
   * @returns Usuario o null si no existe
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByUsername(username)
  }

  /**
   * Busca un usuario por CI
   * @returns Usuario o null si no existe
   */
  async findByCI(ci: string): Promise<UserEntity | null> {
    return await this.usersRepository.findByCI(ci)
  }

  /**
   * Lista usuarios por organización
   */
  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.usersRepository.findByOrganization(organizationId)
  }

  /**
   * Actualiza un usuario
   * Valida unicidad solo de los campos que cambiaron
   * NO actualiza la contraseña (se hace en módulo de autenticación)
   */
  @Transactional()
  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id)

    // Validar solo campos que cambiaron
    if (dto.email && dto.email !== user.email) {
      await this.validator.validateUniqueEmail(dto.email, id)
    }

    if (dto.username && dto.username !== user.username) {
      await this.validator.validateUniqueUsername(dto.username, id)
    }

    if (dto.ci && dto.ci !== user.ci) {
      await this.validator.validateUniqueCI(dto.ci, id)
    }

    // Actualizar usuario usando el factory
    const updatedUser = this.userFactory.updateFromDto(user, dto)

    // Guardar cambios
    return await this.usersRepository.save(updatedUser)
  }

  /**
   * Sube la imagen de perfil del usuario
   * Reemplaza la imagen anterior si existe
   */
  @Transactional()
  async uploadProfileImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<UserEntity> {
    const user = await this.findOne(id)

    // Subir nueva imagen usando FilesService
    const uploadResult = await this.filesService.replaceFile(user.image, {
      file,
      folder: 'users/profiles',
      customFileName: `user-${id}`,
      overwrite: true,
      validationOptions: {
        fileType: FileType.IMAGE,
        maxSize: 2 * 1024 * 1024, // 2MB
        maxWidth: 512,
        maxHeight: 512,
      },
    })

    // Actualizar usuario con nueva URL
    user.image = uploadResult.filePath
    return await this.usersRepository.save(user)
  }

  /**
   * Desactiva un usuario (cambia estado a INACTIVE)
   */
  @Transactional()
  async deactivate(id: string): Promise<UserEntity> {
    const user = await this.findOne(id)

    user.status = UserStatus.INACTIVE
    return await this.usersRepository.save(user)
  }

  /**
   * Elimina un usuario (soft delete)
   * Marca el usuario como eliminado sin borrar sus datos
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id)
    await this.usersRepository.softDelete(user.id)
  }
}
