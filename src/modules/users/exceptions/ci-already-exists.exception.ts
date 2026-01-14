import { ConflictException } from '@nestjs/common'

/**
 * Excepción cuando el CI ya está registrado
 */
export class CiAlreadyExistsException extends ConflictException {
  constructor(ci: string) {
    super(`El CI '${ci}' ya está registrado`)
  }
}
