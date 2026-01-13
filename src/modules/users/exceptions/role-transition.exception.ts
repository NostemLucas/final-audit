import { ForbiddenException } from '@nestjs/common'

/**
 * Exception thrown when trying to change role from CLIENTE to another role
 */
export class RoleTransitionException extends ForbiddenException {
  constructor() {
    super(
      `No se puede cambiar el rol de un usuario CLIENTE. ` +
        `Los usuarios con rol cliente deben mantener este rol de forma permanente. ` +
        `Si necesita cambiar el rol, debe crear un nuevo usuario.`,
    )
  }
}
