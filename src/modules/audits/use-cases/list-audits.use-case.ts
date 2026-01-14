import { Injectable } from '@nestjs/common'
import { AuditRepository } from '../repositories/audit.repository'
import { AuditEntity } from '../entities/audit.entity'
import { AuditStatus } from '../constants/audit-status.enum'

/**
 * List Audits Use Case
 *
 * Lists audits with optional filters
 */
@Injectable()
export class ListAuditsUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(filters?: {
    organizationId?: string
    status?: AuditStatus
    templateId?: string
    frameworkId?: string
  }): Promise<AuditEntity[]> {
    // Filter by organization and status
    if (filters?.organizationId && filters?.status) {
      return await this.auditRepository.findByOrganizationAndStatus(
        filters.organizationId,
        filters.status,
      )
    }

    // Filter by organization only
    if (filters?.organizationId) {
      return await this.auditRepository.findByOrganization(
        filters.organizationId,
      )
    }

    // Filter by template
    if (filters?.templateId) {
      return await this.auditRepository.findByTemplate(filters.templateId)
    }

    // Filter by framework
    if (filters?.frameworkId) {
      return await this.auditRepository.findByFramework(filters.frameworkId)
    }

    // No filters - return all
    return await this.auditRepository.findAll()
  }
}
