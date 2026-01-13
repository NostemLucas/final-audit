import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateStandardDto {
  @ApiProperty({
    description: 'ID del template al que pertenece',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  templateId: string

  @ApiPropertyOptional({
    description: 'ID del standard padre (null para nivel raíz)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string

  @ApiProperty({
    description: 'Código único del standard',
    example: 'A.5.1.1',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string

  @ApiProperty({
    description: 'Título del standard',
    example: 'Políticas para la seguridad de la información',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string

  @ApiPropertyOptional({
    description: 'Descripción detallada',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string

  @ApiProperty({
    description: 'Orden de visualización',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  order: number

  @ApiPropertyOptional({
    description: 'Indica si es auditable',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAuditable?: boolean

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
