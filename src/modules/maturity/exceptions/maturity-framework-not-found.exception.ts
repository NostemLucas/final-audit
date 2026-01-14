import { NotFoundException } from '@nestjs/common'

/**
 * Excepción lanzada cuando no se encuentra un framework de madurez
 */
export class MaturityFrameworkNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(
      `Framework de madurez con identificador "${identifier}" no encontrado`,
    )
  }
}
