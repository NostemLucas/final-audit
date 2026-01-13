import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateTemplateDto } from '../create-template/create-template.dto'

/**
 * DTO para actualizar un template
 * Solo se pueden actualizar templates en estado draft
 */
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
