import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { Transactional } from '@core/database/decorators/transactional.decorator'
import { StandardWeightRepository } from '../repositories/standard-weight.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { BulkCreateWeightsDto } from '../dto/bulk-create-weights.dto'
import { StandardWeightEntity } from '../entities/standard-weight.entity'

/**
 * Bulk Create Weights Use Case
 *
 * Creates or updates multiple standard weights for an audit
 */
@Injectable()
export class BulkCreateWeightsUseCase {
  constructor(
    private readonly weightRepository: StandardWeightRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  @Transactional()
  async execute(dto: BulkCreateWeightsDto): Promise<StandardWeightEntity[]> {
    // 1. Validate audit exists
    const audit = await this.auditRepository.findById(dto.auditId)
    if (!audit) {
      throw new NotFoundException('Audit not found')
    }

    // 2. Validate total weight sums to 100
    const totalWeight = dto.weights.reduce((sum, w) => sum + w.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException(
        `Total weight must sum to 100 (current: ${totalWeight})`,
      )
    }

    // 3. Create or update weights
    const results: StandardWeightEntity[] = []

    for (const weightData of dto.weights) {
      const existing = await this.weightRepository.findByAuditAndStandard(
        dto.auditId,
        weightData.standardId,
      )

      if (existing) {
        // Update existing
        await this.weightRepository.update(existing.id, weightData)
        results.push(await this.weightRepository.findById(existing.id))
      } else {
        // Create new
        const created = await this.weightRepository.save({
          auditId: dto.auditId,
          ...weightData,
        })
        results.push(created)
      }
    }

    return results
  }
}
