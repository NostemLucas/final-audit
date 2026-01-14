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
import {
  CreateAuditUseCase,
  UpdateAuditUseCase,
  GetAuditUseCase,
  ListAuditsUseCase,
  RecalculateScoresUseCase,
} from '../use-cases'
import { CreateAuditDto, UpdateAuditDto } from '../dto'
import { AuditEntity } from '../entities/audit.entity'
import { AuditStatus } from '../constants/audit-status.enum'

@ApiTags('Audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(
    private readonly createAuditUseCase: CreateAuditUseCase,
    private readonly updateAuditUseCase: UpdateAuditUseCase,
    private readonly getAuditUseCase: GetAuditUseCase,
    private readonly listAuditsUseCase: ListAuditsUseCase,
    private readonly recalculateScoresUseCase: RecalculateScoresUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new audit' })
  @ApiResponse({
    status: 201,
    description: 'Audit created successfully',
    type: AuditEntity,
  })
  async create(@Body() dto: CreateAuditDto): Promise<AuditEntity> {
    return await this.createAuditUseCase.execute(dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all audits' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter by organization',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AuditStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'templateId',
    required: false,
    description: 'Filter by template',
  })
  @ApiQuery({
    name: 'frameworkId',
    required: false,
    description: 'Filter by maturity framework',
  })
  @ApiResponse({
    status: 200,
    description: 'Audits retrieved successfully',
    type: [AuditEntity],
  })
  async list(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: AuditStatus,
    @Query('templateId') templateId?: string,
    @Query('frameworkId') frameworkId?: string,
  ): Promise<AuditEntity[]> {
    return await this.listAuditsUseCase.execute({
      organizationId,
      status,
      templateId,
      frameworkId,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit by ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit retrieved successfully',
    type: AuditEntity,
  })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditEntity> {
    return await this.getAuditUseCase.execute(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update audit' })
  @ApiResponse({
    status: 200,
    description: 'Audit updated successfully',
    type: AuditEntity,
  })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuditDto,
  ): Promise<AuditEntity> {
    return await this.updateAuditUseCase.execute(id, dto)
  }

  @Post(':id/recalculate-scores')
  @ApiOperation({ summary: 'Recalculate all scores for an audit' })
  @ApiResponse({
    status: 200,
    description: 'Scores recalculated successfully',
    type: AuditEntity,
  })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  async recalculateScores(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditEntity> {
    return await this.recalculateScoresUseCase.execute(id)
  }
}
