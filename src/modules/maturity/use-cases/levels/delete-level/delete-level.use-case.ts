import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityLevelsRepository } from '../../../repositories'
import { MaturityLevelNotFoundException } from '../../../exceptions'

/**
 * Delete Maturity Level Use Case
 *
 * Elimina un nivel de madurez
 */
@Injectable()
export class DeleteLevelUseCase {
  constructor(private readonly levelsRepository: MaturityLevelsRepository) {}

  /**
   * Ejecuta la eliminación del nivel
   *
   * @param id - ID del nivel a eliminar
   * @throws {MaturityLevelNotFoundException} Si el nivel no existe
   */
  @Transactional()
  async execute(id: string): Promise<void> {
    // 1. Verificar que el nivel existe
    const level = await this.levelsRepository.findById(id)

    if (!level) {
      throw new MaturityLevelNotFoundException(id)
    }

    // 2. Eliminar el nivel (soft delete)
    await this.levelsRepository.softDelete(id)
  }
}
