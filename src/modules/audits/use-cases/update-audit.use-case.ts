import { Injectable, NotFoundException } from '@nestjs/common'
import { AuditRepository } from '../repositories/audit.repository'
import { UpdateAuditDto } from '../dto/update-audit.dto'
import { AuditEntity } from '../entities/audit.entity'

/**
 * Update Audit Use Case
 *
 * Updates audit basic information
 */
@Injectable()
export class UpdateAuditUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  async execute(id: string, dto: UpdateAuditDto): Promise<AuditEntity> {
    const audit = await this.auditRepository.findById(id)

    if (!audit) {
      throw new NotFoundException('Audit not found')
    }

    await this.auditRepository.update(id, dto)

    return await this.auditRepository.findById(id)
  }
}
