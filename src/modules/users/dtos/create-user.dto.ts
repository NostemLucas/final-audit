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
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Role, UserStatus } from '../entities/user.entity'

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombres del usuario',
    example: 'Juan Carlos',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Los nombres deben tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'Los nombres no pueden exceder 50 caracteres' })
  names: string

  @ApiProperty({
    description: 'Apellidos del usuario',
    example: 'Pérez García',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, {
    message: 'Los apellidos deben tener al menos 2 caracteres',
  })
  @MaxLength(50, {
    message: 'Los apellidos no pueden exceder 50 caracteres',
  })
  lastNames: string

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@example.com',
    maxLength: 100,
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @MaxLength(100, { message: 'El email no puede exceder 100 caracteres' })
  email: string

  @ApiProperty({
    description: 'Nombre de usuario (solo letras, números y guión bajo)',
    example: 'juan_perez',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres',
  })
  @MaxLength(30, {
    message: 'El nombre de usuario no puede exceder 30 caracteres',
  })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números y guión bajo',
  })
  username: string

  @ApiProperty({
    description: 'Cédula de Identidad',
    example: '1234567-8',
    minLength: 5,
    maxLength: 15,
  })
  @IsString()
  @MinLength(5, { message: 'El CI debe tener al menos 5 caracteres' })
  @MaxLength(15, { message: 'El CI no puede exceder 15 caracteres' })
  @Matches(/^[0-9A-Za-z-]+$/, {
    message: 'El CI solo puede contener números, letras y guiones',
  })
  ci: string

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'SecurePassword123',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(100, {
    message: 'La contraseña no puede exceder 100 caracteres',
  })
  password: string

  @ApiPropertyOptional({
    description: 'Teléfono de contacto',
    example: '+591 2 234 5678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  phone?: string

  @ApiPropertyOptional({
    description: 'Dirección del usuario',
    example: 'Av. 6 de Agosto #123, La Paz',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La dirección no puede exceder 200 caracteres' })
  address?: string

  @ApiProperty({
    description:
      'ID de la organización a la que pertenece el usuario (requerido)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de organización debe ser un UUID válido' })
  organizationId: string

  @ApiProperty({
    description: 'Roles del usuario',
    enum: Role,
    isArray: true,
    example: [Role.AUDITOR],
  })
  @IsArray({ message: 'Los roles deben ser un array' })
  @IsEnum(Role, { each: true, message: 'Cada rol debe ser válido' })
  roles: Role[]

  @ApiPropertyOptional({
    description: 'Estado del usuario',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado debe ser válido' })
  status?: UserStatus
}
