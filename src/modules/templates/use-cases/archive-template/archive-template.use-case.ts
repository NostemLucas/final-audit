import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { TemplateNotFoundException } from '../../exceptions'
import { TemplateStatus } from '../../constants/template-status.enum'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Archive Template Use Case
 *
 * Archiva un template (published → archived)
 * Templates archived ya no se pueden usar en nuevas auditorías
 */
@Injectable()
export class ArchiveTemplateUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta el archivado del template
   *
   * @param id - ID del template
   * @returns Template archivado
   * @throws {TemplateNotFoundException} Si el template no existe
   */
  @Transactional()
  async execute(id: string): Promise<TemplateEntity> {
    const template = await this.templatesRepository.findById(id)

    if (!template) {
      throw new TemplateNotFoundException(id)
    }

    const updatedTemplate = await this.templatesRepository.updateStatus(
      id,
      TemplateStatus.ARCHIVED,
    )

    if (!updatedTemplate) {
      throw new TemplateNotFoundException(id)
    }

    return updatedTemplate
  }
}
