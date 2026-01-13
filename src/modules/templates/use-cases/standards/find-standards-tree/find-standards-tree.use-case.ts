import { Injectable } from '@nestjs/common'
import { StandardsRepository } from '../../../repositories/standards.repository'
import { TemplatesRepository } from '../../../repositories/templates.repository'
import { TemplateNotFoundException } from '../../../exceptions'
import type { StandardEntity } from '../../../entities/standard.entity'

/**
 * Find Standards Tree Use Case
 *
 * Obtiene los standards de un template en estructura de árbol
 * Solo retorna los nodos raíz, cada uno con sus children cargados recursivamente
 */
@Injectable()
export class FindStandardsTreeUseCase {
  constructor(
    private readonly standardsRepository: StandardsRepository,
    private readonly templatesRepository: TemplatesRepository,
  ) {}

  /**
   * Ejecuta la búsqueda de standards en árbol
   *
   * @param templateId - ID del template
   * @returns Standards raíz con children anidados
   * @throws {TemplateNotFoundException} Si el template no existe
   */
  async execute(templateId: string): Promise<StandardEntity[]> {
    const template = await this.templatesRepository.findById(templateId)
    if (!template) {
      throw new TemplateNotFoundException(templateId)
    }

    // Obtener solo los nodos raíz (sin padre)
    const rootStandards =
      await this.standardsRepository.findRootByTemplate(templateId)

    // Cargar recursivamente todos los hijos
    for (const root of rootStandards) {
      await this.loadChildren(root)
    }

    return rootStandards
  }

  /**
   * Carga recursivamente los hijos de un standard
   */
  private async loadChildren(standard: StandardEntity): Promise<void> {
    if (!standard.children || standard.children.length === 0) {
      return
    }

    // Ordenar hijos por order
    standard.children.sort((a, b) => a.order - b.order)

    // Cargar hijos de forma recursiva
    for (const child of standard.children) {
      const fullChild = await this.standardsRepository.findOneWithRelations(
        child.id,
      )
      if (fullChild && fullChild.children) {
        child.children = fullChild.children
        await this.loadChildren(child)
      }
    }
  }
}
