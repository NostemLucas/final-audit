import { Injectable } from '@nestjs/common'
import { StandardsRepository } from '../../../repositories/standards.repository'
import { TemplatesRepository } from '../../../repositories/templates.repository'
import { TemplateNotFoundException } from '../../../exceptions'
import type { StandardEntity } from '../../../entities/standard.entity'

/**
 * Find Standards By Template Use Case
 *
 * Obtiene todos los standards de un template (lista plana)
 */
@Injectable()
export class FindStandardsByTemplateUseCase {
  constructor(
    private readonly standardsRepository: StandardsRepository,
    private readonly templatesRepository: TemplatesRepository,
  ) {}

  /**
   * Ejecuta la búsqueda de standards
   *
   * @param templateId - ID del template
   * @returns Lista de standards ordenados por order
   * @throws {TemplateNotFoundException} Si el template no existe
   */
  async execute(templateId: string): Promise<StandardEntity[]> {
    const template = await this.templatesRepository.findById(templateId)
    if (!template) {
      throw new TemplateNotFoundException(templateId)
    }

    return await this.standardsRepository.findByTemplate(templateId)
  }
}
