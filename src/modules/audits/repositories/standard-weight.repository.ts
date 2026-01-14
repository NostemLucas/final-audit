import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@core/repositories/base.repository'
import { TransactionService } from '@core/database/transaction.service'
import { AuditService } from '@core/audit/audit.service'
import { StandardWeightEntity } from '../entities/standard-weight.entity'

/**
 * Repository for StandardWeight entities
 *
 * Provides data access methods for section weights including:
 * - Finding weights by audit
 * - Finding weight by section
 * - Calculating weighted scores
 */
@Injectable()
export class StandardWeightRepository extends BaseRepository<StandardWeightEntity> {
  constructor(
    @InjectRepository(StandardWeightEntity)
    repository: Repository<StandardWeightEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Find all weights for a specific audit
   */
  async findByAudit(auditId: string): Promise<StandardWeightEntity[]> {
    return await this.getRepo().find({
      where: { auditId },
      relations: ['standard'],
      order: { weight: 'DESC' },
    })
  }

  /**
   * Find one weight by audit and standard
   */
  async findByAuditAndStandard(
    auditId: string,
    standardId: string,
  ): Promise<StandardWeightEntity | null> {
    return await this.getRepo().findOne({
      where: { auditId, standardId },
      relations: ['standard'],
    })
  }

  /**
   * Calculate total weight for an audit (should be 100)
   */
  async calculateTotalWeight(auditId: string): Promise<number> {
    const result = await this.getRepo()
      .createQueryBuilder('weight')
      .select('SUM(weight.weight)', 'total')
      .where('weight.auditId = :auditId', { auditId })
      .getRawOne()

    return result?.total ? parseFloat(result.total) : 0
  }

  /**
   * Get weights with calculated scores
   */
  async findWithScores(auditId: string): Promise<StandardWeightEntity[]> {
    return await this.getRepo()
      .createQueryBuilder('weight')
      .leftJoinAndSelect('weight.standard', 'standard')
      .where('weight.auditId = :auditId', { auditId })
      .andWhere(
        '(weight.calculatedScore IS NOT NULL OR weight.manualScore IS NOT NULL)',
      )
      .orderBy('weight.weight', 'DESC')
      .getMany()
  }

  /**
   * Count sections with manual scores
   */
  async countManualScores(auditId: string): Promise<number> {
    return await this.getRepo()
      .createQueryBuilder('weight')
      .where('weight.auditId = :auditId', { auditId })
      .andWhere('weight.manualScore IS NOT NULL')
      .getCount()
  }

  /**
   * Get progress summary for all sections
   */
  async getProgressSummary(auditId: string): Promise<
    Array<{
      standardId: string
      standardCode: string
      standardName: string
      weight: number
      finalScore: number | null
      evaluatedControls: number
      totalControls: number
      progress: number
    }>
  > {
    const weights = await this.getRepo()
      .createQueryBuilder('weight')
      .leftJoinAndSelect('weight.standard', 'standard')
      .where('weight.auditId = :auditId', { auditId })
      .orderBy('weight.weight', 'DESC')
      .getMany()

    return weights.map((weight) => ({
      standardId: weight.standardId,
      standardCode: weight.standard?.code || '',
      standardName: weight.standard?.name || '',
      weight: weight.weight,
      finalScore: weight.finalScore,
      evaluatedControls: weight.evaluatedControls,
      totalControls: weight.totalControls,
      progress:
        weight.totalControls > 0
          ? (weight.evaluatedControls / weight.totalControls) * 100
          : 0,
    }))
  }

  /**
   * Validate that weights sum to 100
   */
  async validateWeights(auditId: string): Promise<{
    isValid: boolean
    totalWeight: number
    difference: number
  }> {
    const totalWeight = await this.calculateTotalWeight(auditId)
    const difference = Math.abs(100 - totalWeight)
    const isValid = difference < 0.01 // Allow 0.01 tolerance for floating point

    return {
      isValid,
      totalWeight,
      difference,
    }
  }
}
