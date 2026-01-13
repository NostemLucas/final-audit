import { ConflictException } from '@nestjs/common'

export class TemplateAlreadyExistsException extends ConflictException {
  constructor(name: string, version: string) {
    super(`Ya existe un template con el nombre "${name}" versión "${version}"`)
  }
}
