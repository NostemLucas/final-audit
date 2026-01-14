import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import {
  MaturityFrameworksRepository,
  MaturityLevelsRepository,
} from '../../../repositories'
import { MaturityFrameworkNotFoundException } from '../../../exceptions'
import type { BulkCreateMaturityLevelsDto } from '../../../dtos'
import type { MaturityLevelEntity } from '../../../entities/maturity-level.entity'

/**
 * Bulk Create Maturity Levels Use Case
 *
 * Crea múltiples niveles de madurez de una vez
 *
 * Útil para configurar un framework completo o reemplazar todos sus niveles
 *
 * Reglas de negocio:
 * - El framework debe existir
 * - Se eliminan los niveles existentes antes de crear los nuevos (reemplazo completo)
 * - Todos los niveles deben pertenecer al mismo framework
 */
@Injectable()
export class BulkCreateLevelsUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
    private readonly levelsRepository: MaturityLevelsRepository,
  ) {}

  /**
   * Ejecuta la creación masiva de niveles
   *
   * @param dto - Datos de los niveles a crear
   * @returns Niveles creados
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   */
  @Transactional()
  async execute(dto: BulkCreateMaturityLevelsDto): Promise<MaturityLevelEntity[]> {
    // 1. Verificar que todos los niveles pertenecen al mismo framework
    const frameworkIds = new Set(
      dto.levels.map((level) => level.frameworkId),
    )

    if (frameworkIds.size !== 1) {
      throw new Error(
        'Todos los niveles deben pertenecer al mismo framework',
      )
    }

    const frameworkId = Array.from(frameworkIds)[0]

    // 2. Verificar que el framework existe
    const framework = await this.frameworksRepository.findById(frameworkId)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(frameworkId)
    }

    // 3. Eliminar niveles existentes del framework
    await this.levelsRepository.deleteByFramework(frameworkId)

    // 4. Crear los nuevos niveles
    const createdLevels: MaturityLevelEntity[] = []

    for (const levelDto of dto.levels) {
      const level = await this.levelsRepository.save({
        frameworkId: levelDto.frameworkId,
        level: levelDto.level,
        name: levelDto.name,
        shortName: levelDto.shortName ?? null,
        description: levelDto.description,
        color: levelDto.color,
        icon: levelDto.icon ?? null,
        recommendations: levelDto.recommendations ?? null,
        observations: levelDto.observations ?? null,
        order: levelDto.order,
        isMinimumAcceptable: levelDto.isMinimumAcceptable ?? false,
        isTarget: levelDto.isTarget ?? false,
      })

      createdLevels.push(level)
    }

    return createdLevels
  }
}
