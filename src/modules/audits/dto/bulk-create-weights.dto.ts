import { IsUUID, IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { OmitType } from '@nestjs/swagger'
import { CreateStandardWeightDto } from './create-standard-weight.dto'

class WeightItemDto extends OmitType(CreateStandardWeightDto, [
  'auditId',
] as const) {}

export class BulkCreateWeightsDto {
  @ApiProperty({
    description: 'Audit ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  auditId: string

  @ApiProperty({
    description: 'List of section weights',
    type: [WeightItemDto],
    example: [
      {
        standardId: '123e4567-e89b-12d3-a456-426614174001',
        weight: 10,
        totalControls: 2,
      },
      {
        standardId: '123e4567-e89b-12d3-a456-426614174002',
        weight: 15,
        totalControls: 3,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WeightItemDto)
  weights: WeightItemDto[]
}
