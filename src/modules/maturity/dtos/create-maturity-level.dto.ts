import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Matches,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para crear un nivel de madurez
 */
export class CreateMaturityLevelDto {
  @ApiProperty({
    description: 'ID del framework al que pertenece',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'El frameworkId debe ser un UUID válido' })
  frameworkId: string

  @ApiProperty({
    description: 'Número del nivel de madurez',
    example: 3,
    minimum: 0,
  })
  @IsInt({ message: 'El nivel debe ser un número entero' })
  @Min(0, { message: 'El nivel no puede ser menor a 0' })
  level: number

  @ApiProperty({
    description: 'Nombre completo del nivel',
    example: 'Definido',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string

  @ApiProperty({
    description: 'Nombre corto/abreviado del nivel',
    example: 'Def',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, {
    message: 'El nombre corto no puede exceder 20 caracteres',
  })
  shortName?: string

  @ApiProperty({
    description: 'Descripción completa del nivel',
    example:
      'Los procesos están documentados, estandarizados e integrados en toda la organización.',
  })
  @IsString()
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  description: string

  @ApiProperty({
    description: 'Color en formato hexadecimal',
    example: '#F59E0B',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message:
      'El color debe estar en formato hexadecimal válido (ej: #F59E0B)',
  })
  color: string

  @ApiProperty({
    description: 'Icono o emoji representativo',
    example: '🟡',
    maxLength: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'El icono no puede exceder 10 caracteres' })
  icon?: string

  @ApiProperty({
    description: 'Recomendaciones para alcanzar este nivel',
    example: 'Implementar métricas de rendimiento y monitoreo continuo.',
    required: false,
  })
  @IsOptional()
  @IsString()
  recommendations?: string

  @ApiProperty({
    description: 'Observaciones típicas en este nivel',
    example: 'Procesos documentados y comunicados mediante capacitación.',
    required: false,
  })
  @IsOptional()
  @IsString()
  observations?: string

  @ApiProperty({
    description: 'Orden de visualización',
    example: 3,
    minimum: 0,
  })
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden no puede ser menor a 0' })
  order: number

  @ApiProperty({
    description: 'Indica si es el nivel mínimo aceptable',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isMinimumAcceptable?: boolean

  @ApiProperty({
    description: 'Indica si es el nivel objetivo/ideal',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isTarget?: boolean
}
