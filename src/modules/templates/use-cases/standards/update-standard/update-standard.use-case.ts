import { Injectable, BadRequestException } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { StandardsRepository } from '../../../repositories/standards.repository'
import { TemplatesRepository } from '../../../repositories/templates.repository'
import {
  StandardNotFoundException,
  TemplateNotFoundException,
  TemplateNotEditableException,
} from '../../../exceptions'
import type { UpdateStandardDto } from './update-standard.dto'
import type { StandardEntity } from '../../../entities/standard.entity'

/**
 * Update Standard Use Case
 *
 * Actualiza un standard existente
 *
 * Reglas de negocio:
 * - El standard debe existir
 * - El template del standard debe ser editable
 * - No puede establecerse a sí mismo como padre
 * - Si cambia el padre, recalcular nivel
 */
@Injectable()
export class UpdateStandardUseCase {
  constructor(
    private readonly standardsRepository: StandardsRepository,
    private readonly templatesRepository: TemplatesRepository,
  ) {}

  /**
   * Ejecuta la actualización del standard
   *
   * @param id - ID del standard
   * @param dto - Datos a actualizar
   * @returns Standard actualizado
   * @throws {StandardNotFoundException} Si el standard no existe
   * @throws {TemplateNotEditableException} Si el template no es editable
   * @throws {BadRequestException} Si intenta establecerse como su propio padre
   */
  @Transactional()
  async execute(
    id: string,
    dto: UpdateStandardDto,
  ): Promise<StandardEntity> {
    // 1. Buscar el standard con relaciones
    const standard =
      await this.standardsRepository.findOneWithRelations(id)
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

    // 3. Validar que no se establezca a sí mismo como padre
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException(
        'Un standard no puede ser su propio padre',
      )
    }

    // 4. Recalcular nivel si cambia el padre
    if (dto.parentId !== undefined && dto.parentId !== standard.parentId) {
      if (dto.parentId) {
        const newParent = await this.standardsRepository.findById(
          dto.parentId,
        )
        if (!newParent) {
          throw new StandardNotFoundException(dto.parentId)
        }
        standard.level = newParent.level + 1
      } else {
        standard.level = 1
      }
      standard.parentId = dto.parentId
    }

    // 5. Actualizar otros campos
    if (dto.code !== undefined) standard.code = dto.code
    if (dto.title !== undefined) standard.title = dto.title
    if (dto.description !== undefined)
      standard.description = dto.description
    if (dto.order !== undefined) standard.order = dto.order
    if (dto.isAuditable !== undefined)
      standard.isAuditable = dto.isAuditable
    if (dto.isActive !== undefined) standard.isActive = dto.isActive

    // 6. Guardar cambios
    return await this.standardsRepository.save(standard)
  }
}
