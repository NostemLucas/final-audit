import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { TemplatesRepository } from '../../repositories/templates.repository'
import {
  TemplateNotFoundException,
  TemplateNotEditableException,
} from '../../exceptions'
import type { UpdateTemplateDto } from './update-template.dto'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Update Template Use Case
 *
 * Actualiza un template existente
 *
 * Reglas de negocio:
 * - El template debe existir
 * - El template debe estar en estado draft (editable)
 * - Templates published/archived no pueden editarse
 */
@Injectable()
export class UpdateTemplateUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta la actualización del template
   *
   * @param id - ID del template
   * @param dto - Datos a actualizar
   * @returns Template actualizado
   * @throws {TemplateNotFoundException} Si el template no existe
   * @throws {TemplateNotEditableException} Si el template no es editable
   */
  @Transactional()
  async execute(id: string, dto: UpdateTemplateDto): Promise<TemplateEntity> {
    // 1. Buscar el template
    const template = await this.templatesRepository.findById(id)
    if (!template) {
      throw new TemplateNotFoundException(id)
    }

    // 2. Verificar que sea editable
    if (!template.isEditable) {
      throw new TemplateNotEditableException(id, template.status)
    }

    // 3. Actualizar campos
    if (dto.name !== undefined) template.name = dto.name
    if (dto.description !== undefined) template.description = dto.description
    if (dto.version !== undefined) template.version = dto.version
    if (dto.status !== undefined) template.status = dto.status

    // 4. Guardar cambios
    return await this.templatesRepository.save(template)
  }
}
