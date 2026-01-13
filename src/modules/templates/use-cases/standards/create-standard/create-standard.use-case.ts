import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { StandardsRepository } from '../../../repositories/standards.repository'
import { TemplatesRepository } from '../../../repositories/templates.repository'
import {
  TemplateNotFoundException,
  StandardNotFoundException,
  TemplateNotEditableException,
} from '../../../exceptions'
import type { CreateStandardDto } from './create-standard.dto'
import type { StandardEntity } from '../../../entities/standard.entity'

/**
 * Create Standard Use Case
 *
 * Crea un nuevo standard dentro de un template
 *
 * Reglas de negocio:
 * - El template debe existir y ser editable
 * - Si tiene padre, el padre debe existir
 * - El nivel se calcula automáticamente (padre.level + 1)
 */
@Injectable()
export class CreateStandardUseCase {
  constructor(
    private readonly standardsRepository: StandardsRepository,
    private readonly templatesRepository: TemplatesRepository,
  ) {}

  /**
   * Ejecuta la creación del standard
   *
   * @param dto - Datos del standard
   * @returns Standard creado
   * @throws {TemplateNotFoundException} Si el template no existe
   * @throws {TemplateNotEditableException} Si el template no es editable
   * @throws {StandardNotFoundException} Si el padre no existe
   */
  @Transactional()
  async execute(dto: CreateStandardDto): Promise<StandardEntity> {
    // 1. Verificar que el template existe y es editable
    const template = await this.templatesRepository.findById(dto.templateId)
    if (!template) {
      throw new TemplateNotFoundException(dto.templateId)
    }
    if (!template.isEditable) {
      throw new TemplateNotEditableException(dto.templateId, template.status)
    }

    // 2. Calcular el nivel
    let level = 1
    if (dto.parentId) {
      const parent = await this.standardsRepository.findById(dto.parentId)
      if (!parent) {
        throw new StandardNotFoundException(dto.parentId)
      }
      level = parent.level + 1
    }

    // 3. Crear el standard
    return await this.standardsRepository.save({
      templateId: dto.templateId,
      parentId: dto.parentId ?? null,
      code: dto.code,
      title: dto.title,
      description: dto.description ?? null,
      order: dto.order,
      level,
      isAuditable: dto.isAuditable ?? true,
      isActive: dto.isActive ?? true,
    })
  }
}
