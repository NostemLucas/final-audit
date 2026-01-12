import { ConflictException } from '@nestjs/common'

/**
 * Excepción cuando se agrega
 */
export class ExclusiveRoleException extends ConflictException {
  constructor() {
    super(`El rol cliente no puede ser asignado junto con otros roles`)
  }
}
