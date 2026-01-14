import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityLevelsRepository } from '../../../repositories'
import {
  MaturityLevelNotFoundException,
  MaturityLevelAlreadyExistsException,
} from '../../../exceptions'
import type { UpdateMaturityLevelDto } from '../../../dtos'
import type { MaturityLevelEntity } from '../../../entities/maturity-level.entity'

/**
 * Update Maturity Level Use Case
 *
 * Actualiza un nivel de madurez existente
 *
 * Reglas de negocio:
 * - Si se cambia el número de nivel, debe seguir siendo único en el framework
 */
@Injectable()
export class UpdateLevelUseCase {
  constructor(private readonly levelsRepository: MaturityLevelsRepository) {}

  /**
   * Ejecuta la actualización del nivel
   *
   * @param id - ID del nivel a actualizar
   * @param dto - Datos a actualizar
   * @returns Nivel actualizado
   * @throws {MaturityLevelNotFoundException} Si el nivel no existe
   * @throws {MaturityLevelAlreadyExistsException} Si el nuevo número de nivel ya existe
   */
  @Transactional()
  async execute(
    id: string,
    dto: UpdateMaturityLevelDto,
  ): Promise<MaturityLevelEntity> {
    // 1. Verificar que el nivel existe
    const level = await this.levelsRepository.findById(id)

    if (!level) {
      throw new MaturityLevelNotFoundException(id)
    }

    // 2. Si se actualiza el número de nivel, verificar que no exista otro con ese número
    if (dto.level !== undefined && dto.level !== level.level) {
      const existingLevel = await this.levelsRepository.findByFrameworkAndLevel(
        level.frameworkId,
        dto.level,
      )

      if (existingLevel) {
        throw new MaturityLevelAlreadyExistsException(
          level.frameworkId,
          dto.level,
        )
      }
    }

    // 3. Actualizar el nivel
    const updated = await this.levelsRepository.update(id, dto)

    return level
  }
}
