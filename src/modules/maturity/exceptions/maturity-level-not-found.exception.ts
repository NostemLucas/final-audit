import { NotFoundException } from '@nestjs/common'

/**
 * Excepción lanzada cuando no se encuentra un nivel de madurez
 */
export class MaturityLevelNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Nivel de madurez con identificador "${identifier}" no encontrado`)
  }
}
