import { Injectable, NotFoundException } from '@nestjs/common'
import { AuditRepository } from '../repositories/audit.repository'
import { AuditEntity } from '../entities/audit.entity'

/**
 * Get Audit Use Case
 *
 * Retrieves audit with all relations
 */
@Injectable()
export class GetAuditUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(id: string): Promise<AuditEntity> {
    const audit = await this.auditRepository.findOneWithRelations(id)

    if (!audit) {
      throw new NotFoundException('Audit not found')
    }

    return audit
  }
}
