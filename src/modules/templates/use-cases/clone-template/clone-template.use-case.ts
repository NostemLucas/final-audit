import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { StandardsRepository } from '../../repositories/standards.repository'
import {
  TemplateNotFoundException,
  TemplateAlreadyExistsException,
} from '../../exceptions'
import { TemplateStatus } from '../../constants/template-status.enum'
import type { CloneTemplateDto } from './clone-template.dto'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Clone Template Use Case
 *
 * Clona un template existente para crear una nueva versión
 * Se usa cuando un template published necesita modificaciones
 *
 * Reglas de negocio:
 * - El template origen debe existir
 * - La nueva versión no debe existir
 * - El template clonado se crea en estado draft (editable)
 * - Se clonan todos los standards con la jerarquía completa
 */
@Injectable()
export class CloneTemplateUseCase {
  constructor(
    private readonly templatesRepository: TemplatesRepository,
    private readonly standardsRepository: StandardsRepository,
  ) {}

  /**
   * Ejecuta la clonación del template
   *
   * @param templateId - ID del template a clonar
   * @param dto - Datos de la nueva versión
   * @returns Template clonado
   * @throws {TemplateNotFoundException} Si el template origen no existe
   * @throws {TemplateAlreadyExistsException} Si ya existe un template con esa versión
   */
  @Transactional()
  async execute(
    templateId: string,
    dto: CloneTemplateDto,
  ): Promise<TemplateEntity> {
    // 1. Buscar template origen con standards
    const sourceTemplate =
      await this.templatesRepository.findOneWithStandards(templateId)

    if (!sourceTemplate) {
      throw new TemplateNotFoundException(templateId)
    }

    // 2. Verificar que no exista un template con el mismo nombre y nueva versión
    const existingTemplate =
      await this.templatesRepository.findByNameAndVersion(
        sourceTemplate.name,
        dto.newVersion,
      )

    if (existingTemplate) {
      throw new TemplateAlreadyExistsException(
        sourceTemplate.name,
        dto.newVersion,
      )
    }

    // 3. Clonar el template (en estado draft)
    const clonedTemplate = await this.templatesRepository.save({
      name: sourceTemplate.name,
      description: sourceTemplate.description,
      version: dto.newVersion,
      status: TemplateStatus.DRAFT, // Siempre draft para que sea editable
    })

    // 4. Clonar los standards manteniendo la jerarquía
    if (sourceTemplate.standards && sourceTemplate.standards.length > 0) {
      await this.cloneStandards(
        sourceTemplate.standards,
        clonedTemplate.id,
        null, // Sin padre inicialmente
      )
    }

    // 5. Retornar el template clonado con sus standards
    const result = await this.templatesRepository.findOneWithStandards(
      clonedTemplate.id,
    )

    if (!result) {
      throw new TemplateNotFoundException(clonedTemplate.id)
    }

    return result
  }

  /**
   * Clona recursivamente los standards manteniendo la jerarquía
   */
  private async cloneStandards(
    standards: any[],
    newTemplateId: string,
    newParentId: string | null,
  ): Promise<void> {
    // Mapeo de IDs antiguos a nuevos
    const idMapping = new Map<string, string>()

    // Ordenar por level para procesar padres antes que hijos
    const sortedStandards = [...standards].sort((a, b) => a.level - b.level)

    for (const standard of sortedStandards) {
      // Determinar el nuevo parentId
      let clonedParentId = newParentId
      if (standard.parentId && idMapping.has(standard.parentId)) {
        clonedParentId = idMapping.get(standard.parentId)!
      }

      // Clonar el standard
      const clonedStandard = await this.standardsRepository.save({
        templateId: newTemplateId,
        parentId: clonedParentId,
        code: standard.code,
        title: standard.title,
        description: standard.description,
        order: standard.order,
        level: standard.level,
        isAuditable: standard.isAuditable,
        isActive: standard.isActive,
      })

      // Guardar mapeo de IDs
      idMapping.set(standard.id, clonedStandard.id)
    }
  }
}
