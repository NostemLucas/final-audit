import type { IBaseRepository } from '@core/repositories'
import type { TemplateEntity } from '../../entities/template.entity'
import type { TemplateStatus } from '../../constants/template-status.enum'

/**
 * Templates Repository Interface
 *
 * Define los métodos personalizados para el repositorio de templates
 */
export interface ITemplatesRepository extends IBaseRepository<TemplateEntity> {
  /**
   * Busca un template por nombre y versión
   */
  findByNameAndVersion(
    name: string,
    version: string,
  ): Promise<TemplateEntity | null>

  /**
   * Obtiene todos los templates con un status específico
   */
  findByStatus(status: TemplateStatus): Promise<TemplateEntity[]>

  /**
   * Obtiene todos los templates publicados (usables)
   */
  findPublished(): Promise<TemplateEntity[]>

  /**
   * Obtiene un template con sus standards
   */
  findOneWithStandards(id: string): Promise<TemplateEntity | null>

  /**
   * Cambia el status de un template
   */
  updateStatus(
    id: string,
    status: TemplateStatus,
  ): Promise<TemplateEntity | null>

  /**
   * Obtiene todas las versiones de un template
   */
  findVersionsByName(name: string): Promise<TemplateEntity[]>

  /**
   * Obtiene la última versión de un template
   */
  findLatestVersion(name: string): Promise<TemplateEntity | null>
}
