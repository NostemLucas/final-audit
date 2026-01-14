import { Injectable } from '@nestjs/common'
import {
  MaturityFrameworksRepository,
  MaturityLevelsRepository,
} from '../../../repositories'
import { MaturityFrameworkNotFoundException } from '../../../exceptions'
import type { MaturityLevelEntity } from '../../../entities/maturity-level.entity'

/**
 * Find Levels By Framework Use Case
 *
 * Obtiene todos los niveles de un framework ordenados
 */
@Injectable()
export class FindLevelsByFrameworkUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
    private readonly levelsRepository: MaturityLevelsRepository,
  ) {}

  /**
   * Ejecuta la búsqueda de niveles
   *
   * @param frameworkId - ID del framework
   * @returns Lista de niveles ordenados por orden
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   */
  async execute(frameworkId: string): Promise<MaturityLevelEntity[]> {
    // 1. Verificar que el framework existe
    const framework = await this.frameworksRepository.findById(frameworkId)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(frameworkId)
    }

    // 2. Obtener los niveles
    const levels = await this.levelsRepository.findByFramework(frameworkId)

    return levels
  }
}
