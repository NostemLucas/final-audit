import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TemplateStatus } from '../../constants/template-status.enum'

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Nombre de la plantilla',
    example: 'ISO 27001',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string

  @ApiPropertyOptional({
    description: 'Descripción de la plantilla',
    example: 'Sistema de Gestión de Seguridad de la Información',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  description?: string

  @ApiProperty({
    description: 'Versión de la plantilla',
    example: 'v1.0',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1, { message: 'La versión es requerida' })
  @MaxLength(20, { message: 'La versión no puede exceder 20 caracteres' })
  version: string

  @ApiPropertyOptional({
    description: 'Estado de la plantilla',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
    example: TemplateStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TemplateStatus, { message: 'Estado inválido' })
  status?: TemplateStatus
}
