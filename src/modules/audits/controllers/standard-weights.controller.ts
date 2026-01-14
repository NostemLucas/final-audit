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
import { StandardWeightRepository } from '../repositories/standard-weight.repository'
import { BulkCreateWeightsUseCase } from '../use-cases'
import {
  CreateStandardWeightDto,
  UpdateStandardWeightDto,
  BulkCreateWeightsDto,
} from '../dto'
import { StandardWeightEntity } from '../entities/standard-weight.entity'

@ApiTags('Standard Weights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('standard-weights')
export class StandardWeightsController {
  constructor(
    private readonly weightRepository: StandardWeightRepository,
    private readonly bulkCreateWeightsUseCase: BulkCreateWeightsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or update single weight' })
  @ApiResponse({
    status: 201,
    description: 'Weight created successfully',
    type: StandardWeightEntity,
  })
  async create(
    @Body() dto: CreateStandardWeightDto,
  ): Promise<StandardWeightEntity> {
    // Check if exists
    const existing = await this.weightRepository.findByAuditAndStandard(
      dto.auditId,
      dto.standardId,
    )

    if (existing) {
      await this.weightRepository.update(existing.id, dto)
      return await this.weightRepository.findById(existing.id)
    }

    return await this.weightRepository.save(dto)
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create or update weights' })
  @ApiResponse({
    status: 201,
    description: 'Weights created successfully',
    type: [StandardWeightEntity],
  })
  async bulkCreate(
    @Body() dto: BulkCreateWeightsDto,
  ): Promise<StandardWeightEntity[]> {
    return await this.bulkCreateWeightsUseCase.execute(dto)
  }

  @Get()
  @ApiOperation({ summary: 'List weights by audit' })
  @ApiQuery({ name: 'auditId', required: true, description: 'Audit ID' })
  @ApiResponse({
    status: 200,
    description: 'Weights retrieved successfully',
    type: [StandardWeightEntity],
  })
  async list(
    @Query('auditId', ParseUUIDPipe) auditId: string,
  ): Promise<StandardWeightEntity[]> {
    return await this.weightRepository.findByAudit(auditId)
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get progress summary for all sections' })
  @ApiQuery({ name: 'auditId', required: true, description: 'Audit ID' })
  @ApiResponse({
    status: 200,
    description: 'Progress summary retrieved successfully',
  })
  async getProgressSummary(@Query('auditId', ParseUUIDPipe) auditId: string) {
    return await this.weightRepository.getProgressSummary(auditId)
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate that weights sum to 100' })
  @ApiQuery({ name: 'auditId', required: true, description: 'Audit ID' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
  })
  async validateWeights(@Query('auditId', ParseUUIDPipe) auditId: string) {
    return await this.weightRepository.validateWeights(auditId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get weight by ID' })
  @ApiResponse({
    status: 200,
    description: 'Weight retrieved successfully',
    type: StandardWeightEntity,
  })
  @ApiResponse({ status: 404, description: 'Weight not found' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardWeightEntity> {
    return await this.weightRepository.findById(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update weight' })
  @ApiResponse({
    status: 200,
    description: 'Weight updated successfully',
    type: StandardWeightEntity,
  })
  @ApiResponse({ status: 404, description: 'Weight not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStandardWeightDto,
  ): Promise<StandardWeightEntity> {
    await this.weightRepository.update(id, dto)
    return await this.weightRepository.findById(id)
  }
}
