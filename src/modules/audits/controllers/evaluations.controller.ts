import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { EvaluationRepository } from '../repositories/evaluation.repository'
import {
  CreateEvaluationUseCase,
  UpdateEvaluationUseCase,
} from '../use-cases'
import { CreateEvaluationDto, UpdateEvaluationDto } from '../dto'
import { EvaluationEntity } from '../entities/evaluation.entity'
import { ComplianceStatus } from '../constants/compliance-status.enum'

@ApiTags('Evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly createEvaluationUseCase: CreateEvaluationUseCase,
    private readonly updateEvaluationUseCase: UpdateEvaluationUseCase,
    private readonly evaluationRepository: EvaluationRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or update evaluation' })
  @ApiResponse({
    status: 201,
    description: 'Evaluation created successfully',
    type: EvaluationEntity,
  })
  async create(@Body() dto: CreateEvaluationDto): Promise<EvaluationEntity> {
    return await this.createEvaluationUseCase.execute(dto)
  }

  @Get()
  @ApiOperation({ summary: 'List evaluations by audit' })
  @ApiQuery({ name: 'auditId', required: true, description: 'Audit ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ComplianceStatus,
    description: 'Filter by compliance status',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluations retrieved successfully',
    type: [EvaluationEntity],
  })
  async list(
    @Query('auditId', ParseUUIDPipe) auditId: string,
    @Query('status') status?: ComplianceStatus,
  ): Promise<EvaluationEntity[]> {
    if (status) {
      return await this.evaluationRepository.findByAuditAndStatus(
        auditId,
        status,
      )
    }
    return await this.evaluationRepository.findByAudit(auditId)
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get evaluation statistics for an audit' })
  @ApiQuery({ name: 'auditId', required: true, description: 'Audit ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Query('auditId', ParseUUIDPipe) auditId: string) {
    return await this.evaluationRepository.getStatistics(auditId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evaluation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation retrieved successfully',
    type: EvaluationEntity,
  })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EvaluationEntity> {
    return await this.evaluationRepository.findById(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update evaluation' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation updated successfully',
    type: EvaluationEntity,
  })
  @ApiResponse({ status: 404, description: 'Evaluation not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<EvaluationEntity> {
    return await this.updateEvaluationUseCase.execute(id, dto)
  }
}
