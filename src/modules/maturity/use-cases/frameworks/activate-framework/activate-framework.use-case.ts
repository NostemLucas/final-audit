import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityFrameworksRepository } from '../../../repositories'
import { MaturityFrameworkNotFoundException } from '../../../exceptions'
import type { MaturityFrameworkEntity } from '../../../entities/maturity-framework.entity'

/**
 * Activate/Deactivate Maturity Framework Use Case
 *
 * Activa o desactiva un framework de madurez
 *
 * Frameworks inactivos no pueden ser asignados a nuevas plantillas/auditorías
 */
@Injectable()
export class ActivateFrameworkUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
  ) {}

  /**
   * Ejecuta el cambio de estado del framework
   *
   * @param id - ID del framework
   * @param isActive - Nuevo estado (true = activo, false = inactivo)
   * @returns Framework actualizado
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   */
  @Transactional()
  async execute(id: string, isActive: boolean): Promise<MaturityFrameworkEntity> {
    const framework =
      await this.frameworksRepository.updateActiveStatus(id, isActive)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(id)
    }

    return framework
  }
}
