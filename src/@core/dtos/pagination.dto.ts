import { IsOptional, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator'
import { Type, Transform } from 'class-transformer'

enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
/**
 * DTO Base para Paginación
 *
 * @example
 * ```typescript
 * // Uso directo
 * @Get()
 * findAll(@Query() query: PaginationDto) {
 *   return this.service.findAll(query)
 * }
 *
 * // Extendido con filtros
 * export class FindUsersDto extends PaginationDto {
 *   @IsOptional()
 *   @IsString()
 *   search?: string
 *
 *   @IsOptional()
 *   @IsEnum(Role)
 *   role?: Role
 * }
 * ```
 */
export class PaginationDto {
  /**
   * Número de página (empieza en 1)
   * @default 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  /**
   * Cantidad de registros por página
   * @default 10
   * @max 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10

  /**
   * Si es true, devuelve TODOS los registros (ignora page y limit)
   * Pero mantiene la misma estructura de respuesta
   * @default false
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return Boolean(value)
  })
  @IsBoolean()
  all?: boolean = false

  /**
   * Campo por el cual ordenar
   * @example 'createdAt', 'name', 'email'
   */
  @IsOptional()
  sortBy?: string

  /**
   * Dirección del ordenamiento
   * @default 'DESC'
   */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : undefined,
  )
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC
}
