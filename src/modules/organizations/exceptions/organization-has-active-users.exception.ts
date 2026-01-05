import { BadRequestException } from '@nestjs/common'

export class OrganizationHasActiveUsersException extends BadRequestException {
  constructor() {
    super(
      'No se puede desactivar una organización con usuarios activos. Desactive primero los usuarios.',
    )
  }
}
