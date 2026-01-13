import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateStandardDto } from '../create-standard/create-standard.dto'

export class UpdateStandardDto extends PartialType(
  OmitType(CreateStandardDto, ['templateId'] as const),
) {}
