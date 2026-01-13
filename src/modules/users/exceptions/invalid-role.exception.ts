import { BadRequestException } from '@nestjs/common'

/**
 * Exception thrown when an invalid role is provided
 */
export class InvalidRoleException extends BadRequestException {
  constructor(invalidRole: string) {
    super(
      `Rol inválido: ${invalidRole}. Los roles válidos son: admin, gerente, auditor, cliente`,
    )
  }
}
