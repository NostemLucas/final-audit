import { IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CloneTemplateDto {
  @ApiProperty({
    description: 'Nueva versión para la plantilla clonada',
    example: 'v1.1',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1, { message: 'La versión es requerida' })
  @MaxLength(20, { message: 'La versión no puede exceder 20 caracteres' })
  newVersion: string
}
