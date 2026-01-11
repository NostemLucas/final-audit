import { BadRequestException } from '@nestjs/common'

export class OrganizationHasActiveUsersException extends BadRequestException {
  constructor() {
    super(
      'La organización no puede ser desactivada porque tiene usuarios activos asociados',
    )
  }
}
