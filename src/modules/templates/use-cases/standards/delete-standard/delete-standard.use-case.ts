import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { StandardsRepository } from '../../../repositories/standards.repository'
import { TemplatesRepository } from '../../../repositories/templates.repository'
import {
  StandardNotFoundException,
  TemplateNotFoundException,
  TemplateNotEditableException,
  StandardHasChildrenException,
} from '../../../exceptions'

/**
 * Delete Standard Use Case
 *
 * Elimina un standard (soft delete)
 *
 * Reglas de negocio:
 * - El standard debe existir
 * - El template debe ser editable
 * - El standard no debe tener hijos
 */
@Injectable()
export class DeleteStandardUseCase {
  constructor(
    private readonly standardsRepository: StandardsRepository,
    private readonly templatesRepository: TemplatesRepository,
  ) {}

  /**
   * Ejecuta la eliminación del standard
   *
   * @param id - ID del standard
   * @throws {StandardNotFoundException} Si el standard no existe
   * @throws {TemplateNotEditableException} Si el template no es editable
   * @throws {StandardHasChildrenException} Si el standard tiene hijos
   */
  @Transactional()
  async execute(id: string): Promise<void> {
    // 1. Buscar el standard
    const standard = await this.standardsRepository.findById(id)
    if (!standard) {
      throw new StandardNotFoundException(id)
    }

    // 2. Verificar que el template es editable
    const template = await this.templatesRepository.findById(
      standard.templateId,
    )
    if (!template) {
      throw new TemplateNotFoundException(standard.templateId)
    }
    if (!template.isEditable) {
      throw new TemplateNotEditableException(template.id, template.status)
    }

    // 3. Verificar que no tenga hijos
    const childCount = await this.standardsRepository.countChildren(id)
    if (childCount > 0) {
      throw new StandardHasChildrenException(id, childCount)
    }

    // 4. Eliminar (soft delete)
    await this.standardsRepository.softDelete(id)
  }
}
