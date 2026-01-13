import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from '@core/i18n'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Role, UserStatus } from '../entities/user.entity'
import { USER_CONSTRAINTS } from '../constants/user-schema.constants'

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombres del usuario',
    example: 'Juan Carlos',
    minLength: USER_CONSTRAINTS.NAMES.MIN,
    maxLength: USER_CONSTRAINTS.NAMES.MAX,
  })
  @IsString()
  @MinLength(USER_CONSTRAINTS.NAMES.MIN)
  @MaxLength(USER_CONSTRAINTS.NAMES.MAX)
  names: string

  @ApiProperty({
    description: 'Apellidos del usuario',
    example: 'Pérez García',
    minLength: USER_CONSTRAINTS.LAST_NAMES.MIN,
    maxLength: USER_CONSTRAINTS.LAST_NAMES.MAX,
  })
  @IsString()
  @MinLength(USER_CONSTRAINTS.LAST_NAMES.MIN)
  @MaxLength(USER_CONSTRAINTS.LAST_NAMES.MAX)
  lastNames: string

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@example.com',
    maxLength: USER_CONSTRAINTS.EMAIL.MAX,
  })
  @IsEmail()
  @MaxLength(USER_CONSTRAINTS.EMAIL.MAX)
  email: string

  @ApiProperty({
    description: 'Nombre de usuario (solo letras, números y guión bajo)',
    example: 'juan_perez',
    minLength: USER_CONSTRAINTS.USERNAME.MIN,
    maxLength: USER_CONSTRAINTS.USERNAME.MAX,
  })
  @IsString()
  @MinLength(USER_CONSTRAINTS.USERNAME.MIN)
  @MaxLength(USER_CONSTRAINTS.USERNAME.MAX)
  @Matches(USER_CONSTRAINTS.USERNAME.PATTERN)
  username: string

  @ApiProperty({
    description: 'Cédula de Identidad',
    example: '1234567-8',
    minLength: USER_CONSTRAINTS.CI.MIN,
    maxLength: USER_CONSTRAINTS.CI.MAX,
  })
  @IsString()
  @MinLength(USER_CONSTRAINTS.CI.MIN)
  @MaxLength(USER_CONSTRAINTS.CI.MAX)
  @Matches(USER_CONSTRAINTS.CI.PATTERN)
  ci: string

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'SecurePassword123',
    minLength: USER_CONSTRAINTS.PASSWORD.MIN,
    maxLength: USER_CONSTRAINTS.PASSWORD.MAX,
  })
  @IsString()
  @MinLength(USER_CONSTRAINTS.PASSWORD.MIN)
  @MaxLength(USER_CONSTRAINTS.PASSWORD.MAX)
  password: string

  @ApiPropertyOptional({
    description: 'Teléfono de contacto',
    example: '+591 2 234 5678',
    maxLength: USER_CONSTRAINTS.PHONE.MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTRAINTS.PHONE.MAX)
  phone?: string

  @ApiPropertyOptional({
    description: 'Dirección del usuario',
    example: 'Av. 6 de Agosto #123, La Paz',
    maxLength: USER_CONSTRAINTS.ADDRESS.MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(USER_CONSTRAINTS.ADDRESS.MAX)
  address?: string

  @ApiProperty({
    description:
      'ID de la organización a la que pertenece el usuario (requerido)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  organizationId: string

  @ApiProperty({
    description: 'Roles del usuario',
    enum: Role,
    isArray: true,
    example: [Role.AUDITOR],
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles: Role[]

  @ApiPropertyOptional({
    description: 'Estado del usuario',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus
}
