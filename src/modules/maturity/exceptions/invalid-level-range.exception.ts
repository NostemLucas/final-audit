import { BadRequestException } from '@nestjs/common'

/**
 * Excepción lanzada cuando el rango de niveles es inválido
 */
export class InvalidLevelRangeException extends BadRequestException {
  constructor(minLevel: number, maxLevel: number) {
    super(
      `Rango de niveles inválido: el nivel mínimo (${minLevel}) debe ser menor que el nivel máximo (${maxLevel})`,
    )
  }
}
