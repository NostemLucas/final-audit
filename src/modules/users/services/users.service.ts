import { Injectable } from '@nestjs/common'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserEntity } from '../entities/user.entity'
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  FindUsersByOrganizationUseCase,
  UploadProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
  ActivateUserUseCase,
} from '../use-cases'

/**
 * Servicio de usuarios - Actúa como fachada para los casos de uso
 *
 * Este servicio delega todas las operaciones a casos de uso específicos,
 * proporcionando una API pública consistente para el controlador.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUsersByOrganizationUseCase: FindUsersByOrganizationUseCase,
    private readonly uploadProfileImageUseCase: UploadProfileImageUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly removeUserUseCase: RemoveUserUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
  ) {}

  /**
   * Crea un nuevo usuario
   */
  async create(dto: CreateUserDto): Promise<UserEntity> {
    return await this.createUserUseCase.execute(dto)
  }

  /**
   * Lista todos los usuarios
   */
  async findAll(): Promise<UserEntity[]> {
    return await this.findAllUsersUseCase.execute()
  }

  /**
   * Busca un usuario por ID
   */
  async findOne(id: string): Promise<UserEntity> {
    return await this.findUserByIdUseCase.execute(id)
  }

  /**
   * Lista usuarios por organización
   */
  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.findUsersByOrganizationUseCase.execute(organizationId)
  }

  /**
   * Actualiza un usuario
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    return await this.updateUserUseCase.execute(id, dto)
  }

  /**
   * Sube la imagen de perfil del usuario
   */
  async uploadProfileImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<UserEntity> {
    return await this.uploadProfileImageUseCase.execute(id, file)
  }

  /**
   * Desactiva un usuario
   */
  async deactivate(id: string): Promise<UserEntity> {
    return await this.deactivateUserUseCase.execute(id)
  }
  async activate(id: string): Promise<UserEntity> {
    return await this.activateUserUseCase.execute(id)
  }

  /**
   * Elimina un usuario (soft delete)
   */
  async remove(id: string): Promise<void> {
    return await this.removeUserUseCase.execute(id)
  }
}
