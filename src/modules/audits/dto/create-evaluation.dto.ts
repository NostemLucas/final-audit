import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ComplianceStatus } from '../constants/compliance-status.enum'

export class CreateEvaluationDto {
  @ApiProperty({
    description: 'Audit ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  auditId: string

  @ApiProperty({
    description: 'Standard/Control ID to evaluate',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  standardId: string

  @ApiProperty({
    description: 'Expected maturity level ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  expectedLevelId: string

  @ApiPropertyOptional({
    description: 'Obtained maturity level ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  obtainedLevelId?: string

  @ApiPropertyOptional({
    description: 'Target maturity level ID',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsOptional()
  @IsUUID()
  targetLevelId?: string

  @ApiPropertyOptional({
    description: 'Evidence description',
    example:
      'Se encontró política de seguridad documentada y aprobada por gerencia...',
  })
  @IsOptional()
  @IsString()
  evidence?: string

  @ApiPropertyOptional({
    description: 'Observations',
    example:
      'La política existe desde hace 6 meses, requiere actualización según nuevas normativas...',
  })
  @IsOptional()
  @IsString()
  observations?: string

  @ApiPropertyOptional({
    description: 'Recommendations',
    example:
      '1. Actualizar política según ISO 27001:2022\n2. Implementar programa de capacitación...',
  })
  @IsOptional()
  @IsString()
  recommendations?: string

  @ApiPropertyOptional({
    description: 'Action plan',
    example:
      '1. Diseñar programa de capacitación (2 semanas)\n2. Ejecutar capacitación (1 mes)...',
  })
  @IsOptional()
  @IsString()
  actionPlan?: string

  @ApiPropertyOptional({
    description: 'Due date for action plan (YYYY-MM-DD)',
    example: '2024-06-30',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({
    description: 'Compliance status override (auto-calculated if not provided)',
    enum: ComplianceStatus,
    example: ComplianceStatus.PARTIAL,
  })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  complianceStatus?: ComplianceStatus
}
