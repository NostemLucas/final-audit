import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { CreateMaturityLevelDto } from './create-maturity-level.dto'

/**
 * DTO para crear múltiples niveles de madurez de una vez
 * Útil al configurar un framework completo
 */
export class BulkCreateMaturityLevelsDto {
  @ApiProperty({
    description: 'Array de niveles a crear',
    type: [CreateMaturityLevelDto],
    minItems: 1,
  })
  @IsArray({ message: 'levels debe ser un array' })
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un nivel' })
  @ValidateNested({ each: true })
  @Type(() => CreateMaturityLevelDto)
  levels: CreateMaturityLevelDto[]
}
