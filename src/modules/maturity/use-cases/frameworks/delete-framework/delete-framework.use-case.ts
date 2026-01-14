import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityFrameworksRepository } from '../../../repositories'
import { MaturityFrameworkNotFoundException } from '../../../exceptions'

/**
 * Delete Maturity Framework Use Case
 *
 * Elimina un framework de madurez
 *
 * Nota: Al eliminar el framework, todos sus niveles se eliminan en cascada
 * debido a la configuración de la relación en la entidad
 */
@Injectable()
export class DeleteFrameworkUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
  ) {}

  /**
   * Ejecuta la eliminación del framework
   *
   * @param id - ID del framework a eliminar
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   */
  @Transactional()
  async execute(id: string): Promise<void> {
    // 1. Verificar que el framework existe
    const framework = await this.frameworksRepository.findById(id)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(id)
    }

    // 2. Eliminar el framework (soft delete)
    await this.frameworksRepository.softDelete(id)
  }
}
