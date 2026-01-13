import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { TemplateNotFoundException } from '../../exceptions'
import { TemplateStatus } from '../../constants/template-status.enum'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Publish Template Use Case
 *
 * Publica un template (draft → published)
 * Templates published se vuelven READ-ONLY
 */
@Injectable()
export class PublishTemplateUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta la publicación del template
   *
   * @param id - ID del template
   * @returns Template publicado
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
      TemplateStatus.PUBLISHED,
    )

    if (!updatedTemplate) {
      throw new TemplateNotFoundException(id)
    }

    return updatedTemplate
  }
}
