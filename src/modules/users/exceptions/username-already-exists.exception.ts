import { ConflictException } from '@nestjs/common'

/**
 * Excepción cuando el username ya está en uso
 */
export class UsernameAlreadyExistsException extends ConflictException {
  constructor(username: string) {
    super(`El username '${username}' ya está en uso`)
  }
}
