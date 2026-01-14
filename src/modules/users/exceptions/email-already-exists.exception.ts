import { ConflictException } from '@nestjs/common'

/**
 * Excepción cuando el email ya está registrado
 */
export class EmailAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`El email '${email}' ya está registrado`)
  }
}
