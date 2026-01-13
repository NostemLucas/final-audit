import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator'

/**
 * DTO para importar Template desde Excel/CSV
 *
 * Representa la información básica de una plantilla
 */
export class ImportTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsNotEmpty({ message: 'La versión es requerida' })
  @Length(1, 20, { message: 'La versión debe tener entre 1 y 20 caracteres' })
  version: string
}
