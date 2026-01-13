import { Injectable } from '@nestjs/common'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { TemplateNotFoundException } from '../../exceptions'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Find Template Use Case
 *
 * Obtiene un template por ID con sus standards
 */
@Injectable()
export class FindTemplateUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta la búsqueda del template
   *
   * @param id - ID del template
   * @returns Template encontrado con standards
   * @throws {TemplateNotFoundException} Si el template no existe
   */
  async execute(id: string): Promise<TemplateEntity> {
    const template = await this.templatesRepository.findOneWithStandards(id)

    if (!template) {
      throw new TemplateNotFoundException(id)
    }

    return template
  }
}
