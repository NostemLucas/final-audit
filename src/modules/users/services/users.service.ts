import { Injectable } from '@nestjs/common'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserEntity } from '../entities/user.entity'
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  FindUserByEmailUseCase,
  FindUserByUsernameUseCase,
  FindUserByCIUseCase,
  FindUsersByOrganizationUseCase,
  UploadProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
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
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly findUserByUsernameUseCase: FindUserByUsernameUseCase,
    private readonly findUserByCIUseCase: FindUserByCIUseCase,
    private readonly findUsersByOrganizationUseCase: FindUsersByOrganizationUseCase,
    private readonly uploadProfileImageUseCase: UploadProfileImageUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly removeUserUseCase: RemoveUserUseCase,
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
   * Busca un usuario por email
   */
  async findByEmail(email: string): Promise<UserEntity> {
    return await this.findUserByEmailUseCase.execute(email)
  }

  /**
   * Busca un usuario por username
   */
  async findByUsername(username: string): Promise<UserEntity> {
    return await this.findUserByUsernameUseCase.execute(username)
  }

  /**
   * Busca un usuario por CI
   */
  async findByCI(ci: string): Promise<UserEntity> {
    return await this.findUserByCIUseCase.execute(ci)
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

  /**
   * Elimina un usuario (soft delete)
   */
  async remove(id: string): Promise<void> {
    return await this.removeUserUseCase.execute(id)
  }
}
