import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator'

export class UpdateStandardDto {
  @IsOptional()
  @IsUUID('4', { message: 'El templateId debe ser un UUID válido' })
  templateId?: string

  @IsOptional()
  @IsUUID('4', { message: 'El parentId debe ser un UUID válido' })
  parentId?: string

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El código debe tener al menos 1 caracter' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  code?: string

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  description?: string

  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order?: number

  @IsOptional()
  @IsInt({ message: 'El nivel debe ser un número entero' })
  @Min(1, { message: 'El nivel debe ser mayor o igual a 1' })
  level?: number

  @IsOptional()
  @IsBoolean()
  isAuditable?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
