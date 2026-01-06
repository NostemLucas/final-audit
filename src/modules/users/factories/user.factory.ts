import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { CreateUserDto, UpdateUserDto } from '../dtos'

@Injectable()
export class UserFactory {
  private readonly SALT_ROUNDS = 10

  /**
   * Crea una nueva entidad UserEntity desde un CreateUserDto
   * Hashea la contraseña automáticamente usando bcrypt
   *
   * @param dto - Datos del usuario a crear
   * @returns Nueva instancia de UserEntity (sin persistir)
   */
  createFromDto(dto: CreateUserDto): UserEntity {
    const user = new UserEntity()

    user.names = dto.names
    user.lastNames = dto.lastNames
    user.email = dto.email.toLowerCase()
    user.username = dto.username.toLowerCase()
    user.ci = dto.ci
    user.password = this.hashPassword(dto.password)
    user.phone = dto.phone ?? null
    user.address = dto.address ?? null
    user.organizationId = dto.organizationId ?? null
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
    if (dto.organizationId !== undefined)
      user.organizationId = dto.organizationId
    if (dto.roles !== undefined) user.roles = dto.roles
    if (dto.status !== undefined) user.status = dto.status

    return user
  }

  /**
   * Hashea una contraseña usando bcrypt de forma sincrónica
   *
   * @param password - Contraseña en texto plano
   * @returns Hash de la contraseña
   */
  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, this.SALT_ROUNDS)
  }

  /**
   * Verifica si una contraseña coincide con su hash
   * Útil para autenticación
   *
   * @param password - Contraseña en texto plano
   * @param hash - Hash almacenado
   * @returns true si la contraseña coincide
   */
  verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash)
  }
}
