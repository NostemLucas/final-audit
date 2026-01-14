import { IBaseRepository } from '@core/repositories/base-repository.interface'
import { PaginatedResponse } from '@core/dtos'
import { UserEntity } from '../entities/user.entity'
import { FindUsersDto } from '../dtos/find-users.dto'
import { UserResponseDto } from '../dtos/user-response.dto'

export interface IUsersRepository extends IBaseRepository<UserEntity> {
  // Búsquedas básicas
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  findByUsernameOrEmailWithPassword(
    usernameOrEmail: string,
  ): Promise<UserEntity | null>
  findByCI(ci: string): Promise<UserEntity | null>
  findByOrganization(organizationId: string): Promise<UserEntity[]>

  // Validaciones de unicidad
  existsByEmail(email: string, excludeId?: string): Promise<boolean>
  existsByUsername(username: string, excludeId?: string): Promise<boolean>
  existsByCI(ci: string, excludeId?: string): Promise<boolean>

  // Contadores
  countUsersByOrganization(organizationId: string): Promise<number>

  // Paginación con filtros
  paginateWithFilters(
    findUsersDto: FindUsersDto,
  ): Promise<PaginatedResponse<UserEntity>>

  paginateAndMap(
    findUsersDto: FindUsersDto,
  ): Promise<PaginatedResponse<UserResponseDto>>
}
