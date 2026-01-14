import { ConflictException } from '@nestjs/common'

/**
 * Excepción lanzada cuando se intenta crear un framework con un código que ya existe
 */
export class MaturityFrameworkAlreadyExistsException extends ConflictException {
  constructor(code: string) {
    super(`Ya existe un framework de madurez con el código "${code}"`)
  }
}
