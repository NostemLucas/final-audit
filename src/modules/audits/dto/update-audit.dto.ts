import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateAuditDto } from './create-audit.dto'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { AuditStatus } from '../constants/audit-status.enum'

export class UpdateAuditDto extends PartialType(
  OmitType(CreateAuditDto, ['templateId', 'organizationId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Audit status',
    enum: AuditStatus,
    example: AuditStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus

  @ApiPropertyOptional({
    description: 'Final conclusions',
  })
  @IsOptional()
  @IsString()
  conclusions?: string

  @ApiPropertyOptional({
    description: 'General recommendations',
  })
  @IsOptional()
  @IsString()
  recommendations?: string
}
