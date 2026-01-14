import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateStandardWeightDto } from './create-standard-weight.dto'

export class UpdateStandardWeightDto extends PartialType(
  OmitType(CreateStandardWeightDto, ['auditId', 'standardId'] as const),
) {}
