import { PartialType } from '@nestjs/swagger'
import { CreateMaturityFrameworkDto } from './create-maturity-framework.dto'

/**
 * DTO para actualizar un framework de madurez
 *
 * Todos los campos son opcionales
 */
export class UpdateMaturityFrameworkDto extends PartialType(
  CreateMaturityFrameworkDto,
) {}
