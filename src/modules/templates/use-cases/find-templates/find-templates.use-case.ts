import { Injectable } from '@nestjs/common'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { TemplateStatus } from '../../constants/template-status.enum'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Find Templates Use Case
 *
 * Obtiene todos los templates del sistema con filtro opcional por status
 */
@Injectable()
export class FindTemplatesUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta la búsqueda de templates
   *
   * @param status - Filtro opcional por status
   * @returns Lista de templates
   */
  async execute(status?: string): Promise<TemplateEntity[]> {
    // Si se proporciona status, filtrar por él
    if (
      status &&
      Object.values(TemplateStatus).includes(status as TemplateStatus)
    ) {
      return await this.templatesRepository.findByStatus(
        status as TemplateStatus,
      )
    }

    // Sin filtro, retornar todos
    return await this.templatesRepository.findAll()
  }
}
