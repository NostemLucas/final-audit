import { NotFoundException } from '@nestjs/common'

export class TemplateNotFoundException extends NotFoundException {
  constructor(templateId: string) {
    super(`Template con ID ${templateId} no encontrado`)
  }
}
