import type { MaturityLevelEntity } from '../../entities/maturity-level.entity'

/**
 * Maturity Levels Repository Interface
 *
 * Define los métodos personalizados del repositorio de niveles de madurez
 */
export interface IMaturityLevelsRepository {
  /**
   * Obtiene todos los niveles de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Lista de niveles ordenados por orden
   */
  findByFramework(frameworkId: string): Promise<MaturityLevelEntity[]>

  /**
   * Busca un nivel específico dentro de un framework
   *
   * @param frameworkId - ID del framework
   * @param level - Número del nivel
   * @returns Nivel encontrado o null
   */
  findByFrameworkAndLevel(
    frameworkId: string,
    level: number,
  ): Promise<MaturityLevelEntity | null>

  /**
   * Obtiene el nivel mínimo aceptable de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Nivel mínimo aceptable o null
   */
  findMinimumAcceptable(
    frameworkId: string,
  ): Promise<MaturityLevelEntity | null>

  /**
   * Obtiene el nivel objetivo de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Nivel objetivo o null
   */
  findTarget(frameworkId: string): Promise<MaturityLevelEntity | null>

  /**
   * Elimina todos los niveles de un framework
   * Usado al actualizar niveles en bulk
   *
   * @param frameworkId - ID del framework
   */
  deleteByFramework(frameworkId: string): Promise<void>
}
