import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { BaseRepository } from '@core/repositories/base.repository'
import { TransactionService } from '@core/database/transaction.service'
import { AuditService } from '@core/audit/audit.service'
import { EvaluationEntity } from '../entities/evaluation.entity'
import { ComplianceStatus } from '../constants/compliance-status.enum'

/**
 * Repository for Evaluation entities
 *
 * Provides data access methods for control evaluations including:
 * - Finding evaluations by audit
 * - Finding evaluations by compliance status
 * - Filtering by evaluator and dates
 */
@Injectable()
export class EvaluationRepository extends BaseRepository<EvaluationEntity> {
  constructor(
    @InjectRepository(EvaluationEntity)
    repository: Repository<EvaluationEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Find all evaluations for a specific audit
   */
  async findByAudit(auditId: string): Promise<EvaluationEntity[]> {
    return await this.getRepo().find({
      where: { auditId },
      relations: [
        'standard',
        'expectedLevel',
        'obtainedLevel',
        'targetLevel',
      ],
      order: { createdAt: 'ASC' },
    })
  }

  /**
   * Find evaluations by audit and compliance status
   */
  async findByAuditAndStatus(
    auditId: string,
    status: ComplianceStatus,
  ): Promise<EvaluationEntity[]> {
    return await this.getRepo().find({
      where: { auditId, complianceStatus: status },
      relations: [
        'standard',
        'expectedLevel',
        'obtainedLevel',
        'targetLevel',
      ],
      order: { createdAt: 'ASC' },
    })
  }

  /**
   * Find one evaluation by audit and standard
   */
  async findByAuditAndStandard(
    auditId: string,
    standardId: string,
  ): Promise<EvaluationEntity | null> {
    return await this.getRepo().findOne({
      where: { auditId, standardId },
      relations: [
        'standard',
        'expectedLevel',
        'obtainedLevel',
        'targetLevel',
      ],
    })
  }

  /**
   * Find evaluations by multiple standard IDs
   */
  async findByAuditAndStandards(
    auditId: string,
    standardIds: string[],
  ): Promise<EvaluationEntity[]> {
    return await this.getRepo().find({
      where: {
        auditId,
        standardId: In(standardIds),
      },
      relations: [
        'standard',
        'expectedLevel',
        'obtainedLevel',
        'targetLevel',
      ],
    })
  }

  /**
   * Count evaluated controls (with obtainedLevel set)
   */
  async countEvaluated(auditId: string): Promise<number> {
    return await this.getRepo()
      .createQueryBuilder('evaluation')
      .where('evaluation.auditId = :auditId', { auditId })
      .andWhere('evaluation.obtainedLevelId IS NOT NULL')
      .getCount()
  }

  /**
   * Count compliant controls
   */
  async countCompliant(auditId: string): Promise<number> {
    return await this.getRepo().count({
      where: {
        auditId,
        complianceStatus: In([
          ComplianceStatus.COMPLIANT,
          ComplianceStatus.NOT_APPLICABLE,
        ]),
      },
    })
  }

  /**
   * Find pending evaluations (not yet evaluated)
   */
  async findPending(auditId: string): Promise<EvaluationEntity[]> {
    return await this.getRepo().find({
      where: {
        auditId,
        complianceStatus: ComplianceStatus.PENDING,
      },
      relations: ['standard', 'expectedLevel', 'targetLevel'],
      order: { createdAt: 'ASC' },
    })
  }

  /**
   * Find evaluations by evaluator
   */
  async findByEvaluator(
    auditId: string,
    evaluatedBy: string,
  ): Promise<EvaluationEntity[]> {
    return await this.getRepo().find({
      where: { auditId, evaluatedBy },
      relations: [
        'standard',
        'expectedLevel',
        'obtainedLevel',
        'targetLevel',
      ],
      order: { evaluatedAt: 'DESC' },
    })
  }

  /**
   * Get evaluation statistics for an audit
   */
  async getStatistics(auditId: string): Promise<{
    total: number
    evaluated: number
    compliant: number
    partial: number
    nonCompliant: number
    notApplicable: number
    pending: number
  }> {
    const [
      total,
      evaluated,
      compliant,
      partial,
      nonCompliant,
      notApplicable,
      pending,
    ] = await Promise.all([
      this.getRepo().count({ where: { auditId } }),
      this.countEvaluated(auditId),
      this.getRepo().count({
        where: { auditId, complianceStatus: ComplianceStatus.COMPLIANT },
      }),
      this.getRepo().count({
        where: { auditId, complianceStatus: ComplianceStatus.PARTIAL },
      }),
      this.getRepo().count({
        where: { auditId, complianceStatus: ComplianceStatus.NON_COMPLIANT },
      }),
      this.getRepo().count({
        where: { auditId, complianceStatus: ComplianceStatus.NOT_APPLICABLE },
      }),
      this.getRepo().count({
        where: { auditId, complianceStatus: ComplianceStatus.PENDING },
      }),
    ])

    return {
      total,
      evaluated,
      compliant,
      partial,
      nonCompliant,
      notApplicable,
      pending,
    }
  }
}
