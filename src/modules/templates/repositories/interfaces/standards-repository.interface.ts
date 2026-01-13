import type { IBaseRepository } from '@core/repositories'
import type { StandardEntity } from '../../entities/standard.entity'

/**
 * Standards Repository Interface
 *
 * Define los métodos personalizados para el repositorio de standards
 */
export interface IStandardsRepository
  extends IBaseRepository<StandardEntity> {
  /**
   * Obtiene todos los standards de un template
   */
  findByTemplate(templateId: string): Promise<StandardEntity[]>

  /**
   * Obtiene los standards raíz (sin padre) de un template
   * Útil para construir el árbol desde la raíz
   */
  findRootByTemplate(templateId: string): Promise<StandardEntity[]>

  /**
   * Obtiene los hijos directos de un standard
   */
  findChildren(parentId: string): Promise<StandardEntity[]>

  /**
   * Obtiene solo los standards auditables y activos de un template
   */
  findAuditableByTemplate(templateId: string): Promise<StandardEntity[]>

  /**
   * Busca un standard por código dentro de un template
   */
  findByCode(
    templateId: string,
    code: string,
  ): Promise<StandardEntity | null>

  /**
   * Obtiene un standard con sus relaciones completas (template, parent, children)
   */
  findOneWithRelations(id: string): Promise<StandardEntity | null>

  /**
   * Desactiva un standard
   */
  deactivate(id: string): Promise<StandardEntity | null>

  /**
   * Activa un standard
   */
  activate(id: string): Promise<StandardEntity | null>

  /**
   * Cuenta los hijos de un standard
   * Útil para validar antes de eliminar
   */
  countChildren(parentId: string): Promise<number>
}
