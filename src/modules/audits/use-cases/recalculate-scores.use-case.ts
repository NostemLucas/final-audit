import { Injectable, NotFoundException } from '@nestjs/common'
import { AuditRepository } from '../repositories/audit.repository'
import { AuditScoringService } from '../services/audit-scoring.service'
import { AuditEntity } from '../entities/audit.entity'

/**
 * Recalculate Scores Use Case
 *
 * Manually triggers recalculation of all scores for an audit
 */
@Injectable()
export class RecalculateScoresUseCase {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly scoringService: AuditScoringService,
  ) {}

  async execute(auditId: string): Promise<AuditEntity> {
    // 1. Validate audit exists
    const audit = await this.auditRepository.findById(auditId)
    if (!audit) {
      throw new NotFoundException('Audit not found')
    }

    // 2. Recalculate all scores
    await this.scoringService.recalculateAuditScores(auditId)

    // 3. Return updated audit
    return await this.auditRepository.findOneWithRelations(auditId)
  }
}
