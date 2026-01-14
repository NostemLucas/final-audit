import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator'
import { PaginationDto } from '@core/dtos'
import { UserStatus, Role } from '../entities/user.entity'
import { Transform } from 'class-transformer'

/**
 * DTO para buscar usuarios con filtros específicos
 *
 * Extiende PaginationDto para heredar:
 * - page
 * - limit
 * - all
 * - sortBy
 * - sortOrder
 *
 * Y agrega filtros específicos de usuarios
 *
 * @example
 * ```
 * GET /users?page=1&limit=10&search=john&status=active&role=admin
 * GET /users?all=true&organizationId=123  // Todos los usuarios de org 123
 * GET /users?page=2&limit=20&sortBy=createdAt&sortOrder=ASC
 * ```
 */
export class FindUsersDto extends PaginationDto {
  /**
   * Búsqueda de texto libre
   * Busca en: names, lastNames, email, username, ci
   */
  @IsOptional()
  @IsString()
  search?: string

  /**
   * Filtrar por estado del usuario
   */
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  /**
   * Filtrar por rol
   */
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  /**
   * Filtrar por organización
   */
  @IsOptional()
  @IsString()
  organizationId?: string

  /**
   * Solo usuarios activos (isActive = true)
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return Boolean(value)
  })
  @IsBoolean()
  onlyActive?: boolean
}
