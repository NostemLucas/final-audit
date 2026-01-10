import { NotFoundException } from '@nestjs/common'

/**
 * Excepción cuando la organización especificada no existe
 */
export class OrganizationNotFoundForUserException extends NotFoundException {
  constructor(organizationId: string) {
    super(
      `La organización con ID '${organizationId}' no existe o está inactiva`,
      'ORGANIZATION_NOT_FOUND',
    )
  }
}
