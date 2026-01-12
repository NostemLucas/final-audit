import type { IBaseRepository } from '@core/repositories'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Templates Repository Interface
 *
 * Define los métodos personalizados para el repositorio de templates
 */
export interface ITemplatesRepository
  extends IBaseRepository<TemplateEntity> {
  /**
   * Busca un template por nombre dentro de una organización
   */
  findByName(
    organizationId: string,
    name: string,
  ): Promise<TemplateEntity | null>

  /**
   * Obtiene todos los templates de una organización
   */
  findByOrganization(organizationId: string): Promise<TemplateEntity[]>

  /**
   * Obtiene todos los templates activos de una organización
   */
  findActiveByOrganization(organizationId: string): Promise<TemplateEntity[]>

  /**
   * Obtiene un template con sus standards
   */
  findOneWithStandards(
    organizationId: string,
    id: string,
  ): Promise<TemplateEntity | null>

  /**
   * Desactiva un template
   */
  deactivate(id: string): Promise<TemplateEntity>

  /**
   * Activa un template
   */
  activate(id: string): Promise<TemplateEntity>
}
