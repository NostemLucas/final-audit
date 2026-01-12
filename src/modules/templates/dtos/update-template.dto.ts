import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator'

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'La versión no puede exceder 20 caracteres' })
  version?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
