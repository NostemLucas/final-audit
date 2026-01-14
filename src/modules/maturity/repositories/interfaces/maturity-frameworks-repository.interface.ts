import type { MaturityFrameworkEntity } from '../../entities/maturity-framework.entity'

/**
 * Maturity Frameworks Repository Interface
 *
 * Define los métodos personalizados del repositorio de frameworks de madurez
 */
export interface IMaturityFrameworksRepository {
  /**
   * Busca un framework por su código único
   *
   * @param code - Código del framework (ej: 'cobit5', 'cmmi')
   * @returns Framework encontrado o null
   */
  findByCode(code: string): Promise<MaturityFrameworkEntity | null>

  /**
   * Obtiene todos los frameworks activos
   *
   * @returns Lista de frameworks activos
   */
  findActive(): Promise<MaturityFrameworkEntity[]>

  /**
   * Obtiene un framework con sus niveles
   *
   * @param id - ID del framework
   * @returns Framework con niveles o null
   */
  findOneWithLevels(id: string): Promise<MaturityFrameworkEntity | null>

  /**
   * Cambia el estado activo de un framework
   *
   * @param id - ID del framework
   * @param isActive - Nuevo estado
   * @returns Framework actualizado o null si no existe
   */
  updateActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<MaturityFrameworkEntity | null>
}
