import { BadRequestException } from '@nestjs/common'

export class TemplateNotEditableException extends BadRequestException {
  constructor(templateId: string, status: string) {
    super(
      `El template ${templateId} no es editable porque está en estado "${status}". Solo los templates en estado "draft" pueden ser editados.`,
    )
  }
}
