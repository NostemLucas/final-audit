import { NotFoundException } from '@nestjs/common'

export class OrganizationNotFoundException extends NotFoundException {
  constructor(identifier: string, field: 'ID' | 'NIT' = 'ID') {
    super(`Organización con ${field} ${identifier} no encontrada`)
  }
}
