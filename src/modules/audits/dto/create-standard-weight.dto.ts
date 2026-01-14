import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsInt,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateStandardWeightDto {
  @ApiProperty({
    description: 'Audit ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  auditId: string

  @ApiProperty({
    description: 'Standard/Section ID (parent standard, e.g., A.5, A.6)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  standardId: string

  @ApiProperty({
    description: 'Weight percentage (0-100)',
    example: 15,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weight: number

  @ApiPropertyOptional({
    description: 'Total controls in this section',
    example: 12,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalControls?: number

  @ApiPropertyOptional({
    description: 'Manual score override (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  manualScore?: number

  @ApiPropertyOptional({
    description: 'Justification for manual score',
    example:
      'Aunque los controles cumplen individualmente, existen debilidades en la integración...',
  })
  @IsOptional()
  @IsString()
  manualScoreJustification?: string
}
