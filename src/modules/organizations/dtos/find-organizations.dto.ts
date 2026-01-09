import { IsOptional, IsString, IsBoolean } from 'class-validator'
import { PaginationDto } from '@core/dtos'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

/**
 * DTO para buscar organizaciones con filtros específicos
 *
 * Extiende PaginationDto para heredar:
 * - page
 * - limit
 * - all
 * - sortBy
 * - sortOrder
 *
 * Y agrega filtros específicos de organizaciones
 *
 * @example
 * ```
 * GET /organizations?page=1&limit=10&search=empresa&isActive=true
 * GET /organizations?all=true  // Todas las organizaciones
 * GET /organizations?page=2&limit=20&sortBy=createdAt&sortOrder=ASC
 * GET /organizations?search=coca&hasLogo=true  // Con logo
 * ```
 */
export class FindOrganizationsDto extends PaginationDto {
  /**
   * Búsqueda de texto libre
   * Busca en: name, nit, description, email
   */
  @ApiPropertyOptional({
    description: 'Búsqueda de texto libre en nombre, NIT, descripción o email',
    example: 'coca cola',
  })
  @IsOptional()
  @IsString()
  search?: string

  /**
   * Filtrar por estado de la organización
   */
  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return Boolean(value)
  })
  @IsBoolean()
  isActive?: boolean

  /**
   * Filtrar organizaciones que tienen logo
   */
  @ApiPropertyOptional({
    description: 'Filtrar organizaciones que tienen logo',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return Boolean(value)
  })
  @IsBoolean()
  hasLogo?: boolean
}
