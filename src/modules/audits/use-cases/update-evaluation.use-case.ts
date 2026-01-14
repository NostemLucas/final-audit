import { Injectable, NotFoundException } from '@nestjs/common'
import { Transactional } from '@core/database/decorators/transactional.decorator'
import { EvaluationRepository } from '../repositories/evaluation.repository'
import { AuditScoringService } from '../services/audit-scoring.service'
import { StandardRepository } from '../../templates/repositories/standard.repository'
import { UpdateEvaluationDto } from '../dto/update-evaluation.dto'
import { EvaluationEntity } from '../entities/evaluation.entity'

/**
 * Update Evaluation Use Case
 *
 * Updates an existing evaluation and recalculates scores
 */
@Injectable()
export class UpdateEvaluationUseCase {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly standardRepository: StandardRepository,
    private readonly scoringService: AuditScoringService,
  ) {}

  @Transactional()
  async execute(
    id: string,
    dto: UpdateEvaluationDto,
  ): Promise<EvaluationEntity> {
    // 1. Find evaluation
    const evaluation = await this.evaluationRepository.findById(id)
    if (!evaluation) {
      throw new NotFoundException('Evaluation not found')
    }

    // 2. Update evaluation
    await this.evaluationRepository.update(id, dto)

    // 3. Reload with relations
    const updated = await this.evaluationRepository.findById(id)

    // 4. Recalculate score and gap if levels changed
    if (updated.obtainedLevelId) {
      const score = this.scoringService.calculateEvaluationScore(updated)
      const gap = this.scoringService.calculateEvaluationGap(updated)
      const complianceStatus =
        dto.complianceStatus ||
        this.scoringService.determineComplianceStatus(score)

      await this.evaluationRepository.update(id, {
        score,
        gap,
        complianceStatus,
        evaluatedAt: new Date(),
      })
    }

    // 5. Recalculate section and audit scores
    const standard = await this.standardRepository.findById(
      evaluation.standardId,
    )
    if (standard?.parentId) {
      await this.scoringService.recalculateSectionScore(
        evaluation.auditId,
        standard.parentId,
      )
    }
    await this.scoringService.recalculateAuditScores(evaluation.auditId)

    return await this.evaluationRepository.findById(id)
  }
}
