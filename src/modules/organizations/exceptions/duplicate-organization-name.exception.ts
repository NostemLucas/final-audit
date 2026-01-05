import { ConflictException } from '@nestjs/common'

export class DuplicateOrganizationNameException extends ConflictException {
  constructor(name: string) {
    super(`Ya existe una organización con el nombre "${name}"`)
  }
}
