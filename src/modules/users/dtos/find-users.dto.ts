import { IsOptional, IsString, IsEnum } from 'class-validator'
import { PaginationDto } from '@core/dtos'
import { UserStatus, Role, UserEntity } from '../entities/user.entity'
import { IsIn } from '@core/i18n'

const USER_SORTABLE_FIELDS: (keyof UserEntity)[] = [
  'image',
  'lastNames',
  'email',
  'createdAt',
  'organizationId',
  'status',
  'ci',
  'phone',
  'names',
]
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
   * Puede ser: active, inactive, suspended
   * Si no se especifica, devuelve usuarios con cualquier estado
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

  @IsOptional()
  @IsIn(USER_SORTABLE_FIELDS)
  sortBy?: string = 'createdAt'
}
