import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityFrameworksRepository } from '../../../repositories'
import {
  MaturityFrameworkAlreadyExistsException,
  InvalidLevelRangeException,
} from '../../../exceptions'
import type { CreateMaturityFrameworkDto } from '../../../dtos'
import type { MaturityFrameworkEntity } from '../../../entities/maturity-framework.entity'

/**
 * Create Maturity Framework Use Case
 *
 * Crea un nuevo framework de madurez
 *
 * Reglas de negocio:
 * - El código del framework debe ser único
 * - El nivel mínimo debe ser menor que el nivel máximo
 * - Por defecto se crea como activo
 */
@Injectable()
export class CreateFrameworkUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
  ) {}

  /**
   * Ejecuta la creación del framework
   *
   * @param dto - Datos del framework a crear
   * @returns Framework creado
   * @throws {MaturityFrameworkAlreadyExistsException} Si ya existe un framework con ese código
   * @throws {InvalidLevelRangeException} Si el rango de niveles es inválido
   */
  @Transactional()
  async execute(
    dto: CreateMaturityFrameworkDto,
  ): Promise<MaturityFrameworkEntity> {
    // 1. Verificar que no exista un framework con ese código
    const existingFramework =
      await this.frameworksRepository.findByCode(dto.code)

    if (existingFramework) {
      throw new MaturityFrameworkAlreadyExistsException(dto.code)
    }

    // 2. Validar rango de niveles
    const minLevel = dto.minLevel ?? 0
    const maxLevel = dto.maxLevel ?? 5

    if (minLevel >= maxLevel) {
      throw new InvalidLevelRangeException(minLevel, maxLevel)
    }

    // 3. Crear el framework
    const framework = await this.frameworksRepository.save({
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      minLevel,
      maxLevel,
      isActive: dto.isActive ?? true,
    })

    return framework
  }
}
