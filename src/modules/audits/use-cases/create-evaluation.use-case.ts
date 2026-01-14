import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { Transactional } from '@core/database/decorators/transactional.decorator'
import { EvaluationRepository } from '../repositories/evaluation.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { StandardRepository } from '../../templates/repositories/standard.repository'
import { MaturityLevelRepository } from '../../maturity-frameworks/repositories/maturity-level.repository'
import { AuditScoringService } from '../services/audit-scoring.service'
import { CreateEvaluationDto } from '../dto/create-evaluation.dto'
import { EvaluationEntity } from '../entities/evaluation.entity'

/**
 * Create Evaluation Use Case
 *
 * Creates or updates an evaluation for a control and recalculates scores
 */
@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly auditRepository: AuditRepository,
    private readonly standardRepository: StandardRepository,
    private readonly levelRepository: MaturityLevelRepository,
    private readonly scoringService: AuditScoringService,
  ) {}

  @Transactional()
  async execute(dto: CreateEvaluationDto): Promise<EvaluationEntity> {
    // 1. Validate audit exists
    const audit = await this.auditRepository.findById(dto.auditId)
    if (!audit) {
      throw new NotFoundException('Audit not found')
    }

    // 2. Validate standard exists and is auditable
    const standard = await this.standardRepository.findById(dto.standardId)
    if (!standard) {
      throw new NotFoundException('Standard not found')
    }

    if (!standard.isAuditable) {
      throw new BadRequestException(
        'Standard is not auditable (only leaf controls can be evaluated)',
      )
    }

    // 3. Validate maturity levels exist
    await this.validateLevel(dto.expectedLevelId, 'Expected level')
    if (dto.obtainedLevelId) {
      await this.validateLevel(dto.obtainedLevelId, 'Obtained level')
    }
    if (dto.targetLevelId) {
      await this.validateLevel(dto.targetLevelId, 'Target level')
    }

    // 4. Check if evaluation already exists
    const existing = await this.evaluationRepository.findByAuditAndStandard(
      dto.auditId,
      dto.standardId,
    )

    let evaluation: EvaluationEntity

    if (existing) {
      // Update existing evaluation
      await this.evaluationRepository.update(existing.id, dto)
      evaluation = await this.evaluationRepository.findById(existing.id)
    } else {
      // Create new evaluation
      evaluation = await this.evaluationRepository.save(dto)
    }

    // 5. Load maturity levels for score calculation
    evaluation = await this.evaluationRepository.findByAuditAndStandard(
      dto.auditId,
      dto.standardId,
    )

    // 6. Calculate evaluation score and gap
    if (evaluation.obtainedLevelId) {
      const score = this.scoringService.calculateEvaluationScore(evaluation)
      const gap = this.scoringService.calculateEvaluationGap(evaluation)
      const complianceStatus =
        dto.complianceStatus ||
        this.scoringService.determineComplianceStatus(score)

      await this.evaluationRepository.update(evaluation.id, {
        score,
        gap,
        complianceStatus,
        evaluatedAt: new Date(),
      })
    }

    // 7. Recalculate section and audit scores
    if (standard.parentId) {
      await this.scoringService.recalculateSectionScore(
        dto.auditId,
        standard.parentId,
      )
    }
    await this.scoringService.recalculateAuditScores(dto.auditId)

    // 8. Return updated evaluation
    return await this.evaluationRepository.findById(evaluation.id)
  }

  private async validateLevel(levelId: string, name: string): Promise<void> {
    const level = await this.levelRepository.findById(levelId)
    if (!level) {
      throw new NotFoundException(`${name} not found`)
    }
  }
}
