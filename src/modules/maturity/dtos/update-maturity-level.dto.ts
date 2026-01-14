import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateMaturityLevelDto } from './create-maturity-level.dto'

/**
 * DTO para actualizar un nivel de madurez
 *
 * Todos los campos son opcionales excepto frameworkId que no se puede cambiar
 */
export class UpdateMaturityLevelDto extends PartialType(
  OmitType(CreateMaturityLevelDto, ['frameworkId'] as const),
) {}
