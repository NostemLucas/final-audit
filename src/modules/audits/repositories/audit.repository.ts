import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere } from 'typeorm'
import { BaseRepository } from '@core/repositories/base.repository'
import { TransactionService } from '@core/database/transaction.service'
import { AuditService } from '@core/audit/audit.service'
import { AuditEntity } from '../entities/audit.entity'
import { AuditStatus } from '../constants/audit-status.enum'

/**
 * Repository for Audit entities
 *
 * Provides data access methods for audits including:
 * - Finding audits by organization
 * - Finding audits by template/framework
 * - Filtering by status and dates
 */
@Injectable()
export class AuditRepository extends BaseRepository<AuditEntity> {
  constructor(
    @InjectRepository(AuditEntity)
    repository: Repository<AuditEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Find all audits for a specific organization
   */
  async findByOrganization(organizationId: string): Promise<AuditEntity[]> {
    return await this.getRepo().find({
      where: { organizationId },
      order: { startDate: 'DESC' },
      relations: ['template', 'maturityFramework', 'organization'],
    })
  }

  /**
   * Find audits by organization and status
   */
  async findByOrganizationAndStatus(
    organizationId: string,
    status: AuditStatus,
  ): Promise<AuditEntity[]> {
    return await this.getRepo().find({
      where: { organizationId, status },
      order: { startDate: 'DESC' },
      relations: ['template', 'maturityFramework', 'organization'],
    })
  }

  /**
   * Find audits by template
   */
  async findByTemplate(templateId: string): Promise<AuditEntity[]> {
    return await this.getRepo().find({
      where: { templateId },
      order: { startDate: 'DESC' },
      relations: ['organization', 'maturityFramework'],
    })
  }

  /**
   * Find audits by maturity framework
   */
  async findByFramework(
    maturityFrameworkId: string,
  ): Promise<AuditEntity[]> {
    return await this.getRepo().find({
      where: { maturityFrameworkId },
      order: { startDate: 'DESC' },
      relations: ['organization', 'template'],
    })
  }

  /**
   * Find one audit with all relations
   */
  async findOneWithRelations(id: string): Promise<AuditEntity | null> {
    return await this.getRepo().findOne({
      where: { id },
      relations: [
        'template',
        'maturityFramework',
        'organization',
        'defaultExpectedLevel',
        'defaultTargetLevel',
        'evaluations',
        'standardWeights',
      ],
    })
  }

  /**
   * Count audits by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return await this.getRepo().count({
      where: { organizationId },
    })
  }

  /**
   * Find active audits (draft or in_progress)
   */
  async findActiveByOrganization(
    organizationId: string,
  ): Promise<AuditEntity[]> {
    return await this.getRepo().find({
      where: [
        { organizationId, status: AuditStatus.DRAFT },
        { organizationId, status: AuditStatus.IN_PROGRESS },
      ],
      order: { startDate: 'DESC' },
      relations: ['template', 'maturityFramework'],
    })
  }
}
