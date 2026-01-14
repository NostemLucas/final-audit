import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para crear un framework de madurez
 */
export class CreateMaturityFrameworkDto {
  @ApiProperty({
    description: 'Nombre del framework',
    example: 'COBIT 5',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string

  @ApiProperty({
    description:
      'Código único identificador (solo letras minúsculas, números y guiones)',
    example: 'cobit5',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'El código solo puede contener letras minúsculas, números y guiones',
  })
  code: string

  @ApiProperty({
    description: 'Descripción del framework',
    example: 'Framework de gobierno y gestión de TI empresarial',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  description?: string

  @ApiProperty({
    description: 'Nivel mínimo del framework',
    example: 0,
    default: 0,
    minimum: 0,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El nivel mínimo debe ser un número entero' })
  @Min(0, { message: 'El nivel mínimo no puede ser menor a 0' })
  @Max(10, { message: 'El nivel mínimo no puede ser mayor a 10' })
  minLevel?: number

  @ApiProperty({
    description: 'Nivel máximo del framework',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt({ message: 'El nivel máximo debe ser un número entero' })
  @Min(1, { message: 'El nivel máximo no puede ser menor a 1' })
  @Max(10, { message: 'El nivel máximo no puede ser mayor a 10' })
  maxLevel?: number

  @ApiProperty({
    description: 'Indica si el framework está activo',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
