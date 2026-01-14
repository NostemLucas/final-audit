import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import {
  MaturityFrameworksRepository,
  MaturityLevelsRepository,
} from '../../../repositories'
import {
  MaturityFrameworkNotFoundException,
  MaturityLevelAlreadyExistsException,
} from '../../../exceptions'
import type { CreateMaturityLevelDto } from '../../../dtos'
import type { MaturityLevelEntity } from '../../../entities/maturity-level.entity'

/**
 * Create Maturity Level Use Case
 *
 * Crea un nuevo nivel de madurez para un framework
 *
 * Reglas de negocio:
 * - El framework debe existir
 * - El nivel debe ser único dentro del framework
 * - El número de nivel debe estar dentro del rango del framework
 */
@Injectable()
export class CreateLevelUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
    private readonly levelsRepository: MaturityLevelsRepository,
  ) {}

  /**
   * Ejecuta la creación del nivel
   *
   * @param dto - Datos del nivel a crear
   * @returns Nivel creado
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   * @throws {MaturityLevelAlreadyExistsException} Si ya existe ese nivel en el framework
   */
  @Transactional()
  async execute(dto: CreateMaturityLevelDto): Promise<MaturityLevelEntity> {
    // 1. Verificar que el framework existe
    const framework =
      await this.frameworksRepository.findById(dto.frameworkId)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(dto.frameworkId)
    }

    // 2. Verificar que no exista ese nivel en el framework
    const existingLevel =
      await this.levelsRepository.findByFrameworkAndLevel(
        dto.frameworkId,
        dto.level,
      )

    if (existingLevel) {
      throw new MaturityLevelAlreadyExistsException(dto.frameworkId, dto.level)
    }

    // 3. Crear el nivel
    const level = await this.levelsRepository.save({
      frameworkId: dto.frameworkId,
      level: dto.level,
      name: dto.name,
      shortName: dto.shortName ?? null,
      description: dto.description,
      color: dto.color,
      icon: dto.icon ?? null,
      recommendations: dto.recommendations ?? null,
      observations: dto.observations ?? null,
      order: dto.order,
      isMinimumAcceptable: dto.isMinimumAcceptable ?? false,
      isTarget: dto.isTarget ?? false,
    })

    return level
  }
}
