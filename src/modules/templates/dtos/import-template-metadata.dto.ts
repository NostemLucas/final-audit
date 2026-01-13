import { IsString, IsNotEmpty, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para los campos de metadatos de la plantilla al importar
 *
 * Estos campos se envían como form fields (no en el archivo Excel/CSV)
 * El archivo solo contiene los estándares
 */
export class ImportTemplateMetadataDto {
  @ApiProperty({
    description: 'Nombre de la plantilla',
    example: 'ISO 27001',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name: string

  @ApiProperty({
    description: 'Descripción de la plantilla',
    example: 'Plantilla de controles ISO 27001:2022',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string

  @ApiProperty({
    description: 'Versión de la plantilla',
    example: '1.0',
  })
  @IsString()
  @IsNotEmpty({ message: 'La versión es requerida' })
  @Length(1, 20, { message: 'La versión debe tener entre 1 y 20 caracteres' })
  version: string
}
