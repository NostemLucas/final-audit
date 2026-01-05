import { ConflictException } from '@nestjs/common'

export class DuplicateOrganizationNitException extends ConflictException {
  constructor(nit: string) {
    super(`Ya existe una organización con el NIT "${nit}"`)
  }
}
