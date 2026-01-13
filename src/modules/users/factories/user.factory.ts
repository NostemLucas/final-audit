import { Injectable } from '@nestjs/common'
import { PasswordHashService } from '@core/security'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { CreateUserDto, UpdateUserDto } from '../dtos'

@Injectable()
export class UserFactory {
  constructor(private readonly passwordHashService: PasswordHashService) {}

  /**
   * Crea una nueva entidad UserEntity desde un CreateUserDto
   * Hashea la contraseña automáticamente usando PasswordHashService
   *
   * @param dto - Datos del usuario a crear
   * @returns Promise con nueva instancia de UserEntity (sin persistir)
   */
  async createFromDto(dto: CreateUserDto): Promise<UserEntity> {
    const user = new UserEntity()

    user.names = dto.names
    user.lastNames = dto.lastNames
    user.email = dto.email.toLowerCase()
    user.username = dto.username.toLowerCase()
    user.ci = dto.ci
    user.password = await this.passwordHashService.hash(dto.password)
    user.phone = dto.phone ?? null
    user.address = dto.address ?? null
    user.organizationId = dto.organizationId
    user.roles = dto.roles
    user.status = dto.status ?? UserStatus.ACTIVE
    user.image = null

    return user
  }

  /**
   * Actualiza una entidad UserEntity existente desde un UpdateUserDto
   * NO actualiza la contraseña (se hace en módulo de autenticación)
   *
   * @param user - Entidad de usuario existente
   * @param dto - Datos a actualizar
   * @returns La entidad actualizada (misma referencia)
   */
  updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
    if (dto.names !== undefined) user.names = dto.names
    if (dto.lastNames !== undefined) user.lastNames = dto.lastNames
    if (dto.email !== undefined) user.email = dto.email.toLowerCase()
    if (dto.username !== undefined) user.username = dto.username.toLowerCase()
    if (dto.ci !== undefined) user.ci = dto.ci
    if (dto.phone !== undefined) user.phone = dto.phone
    if (dto.address !== undefined) user.address = dto.address
    if (dto.roles !== undefined) user.roles = dto.roles
    if (dto.status !== undefined) user.status = dto.status

    return user
  }
}
