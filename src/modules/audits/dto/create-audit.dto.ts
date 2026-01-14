import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AuditType } from '../constants/audit-type.enum'

export class CreateAuditDto {
  @ApiProperty({
    description: 'Audit name',
    example: 'Auditoría ISO 27001 - ACME Corp 2024',
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({
    description: 'Audit description',
    example: 'Auditoría inicial para certificación ISO 27001',
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    description: 'Template ID (ISO 27001, ASFI, etc.)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  templateId: string

  @ApiProperty({
    description: 'Maturity framework ID (COBIT 5, CMMI, etc.)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  maturityFrameworkId: string

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  organizationId: string

  @ApiPropertyOptional({
    description: 'Audit type',
    enum: AuditType,
    example: AuditType.INICIAL,
    default: AuditType.INICIAL,
  })
  @IsOptional()
  @IsEnum(AuditType)
  auditType?: AuditType

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate: string

  @ApiProperty({
    description: 'End date (YYYY-MM-DD)',
    example: '2024-03-31',
  })
  @IsDateString()
  endDate: string

  @ApiPropertyOptional({
    description: 'Default expected maturity level ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  defaultExpectedLevelId?: string

  @ApiPropertyOptional({
    description: 'Default target maturity level ID',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsOptional()
  @IsUUID()
  defaultTargetLevelId?: string

  @ApiPropertyOptional({
    description: 'General observations',
  })
  @IsOptional()
  @IsString()
  observations?: string
}
