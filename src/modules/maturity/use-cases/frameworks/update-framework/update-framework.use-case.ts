import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { MaturityFrameworksRepository } from '../../../repositories'
import {
  MaturityFrameworkNotFoundException,
  MaturityFrameworkAlreadyExistsException,
  InvalidLevelRangeException,
} from '../../../exceptions'
import type { UpdateMaturityFrameworkDto } from '../../../dtos'
import type { MaturityFrameworkEntity } from '../../../entities/maturity-framework.entity'

/**
 * Update Maturity Framework Use Case
 *
 * Actualiza un framework de madurez existente
 *
 * Reglas de negocio:
 * - Si se cambia el código, debe seguir siendo único
 * - Si se cambian los niveles, el mínimo debe ser menor que el máximo
 */
@Injectable()
export class UpdateFrameworkUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
  ) {}

  /**
   * Ejecuta la actualización del framework
   *
   * @param id - ID del framework a actualizar
   * @param dto - Datos a actualizar
   * @returns Framework actualizado
   * @throws {MaturityFrameworkNotFoundException} Si el framework no existe
   * @throws {MaturityFrameworkAlreadyExistsException} Si el nuevo código ya existe
   * @throws {InvalidLevelRangeException} Si el nuevo rango de niveles es inválido
   */
  @Transactional()
  async execute(
    id: string,
    dto: UpdateMaturityFrameworkDto,
  ): Promise<MaturityFrameworkEntity> {
    // 1. Verificar que el framework existe
    const framework = await this.frameworksRepository.findById(id)

    if (!framework) {
      throw new MaturityFrameworkNotFoundException(id)
    }

    // 2. Si se actualiza el código, verificar que no exista otro framework con ese código
    if (dto.code && dto.code !== framework.code) {
      const existingFramework = await this.frameworksRepository.findByCode(
        dto.code,
      )

      if (existingFramework) {
        throw new MaturityFrameworkAlreadyExistsException(dto.code)
      }
    }

    // 3. Validar rango de niveles si se actualiza
    const minLevel = dto.minLevel ?? framework.minLevel
    const maxLevel = dto.maxLevel ?? framework.maxLevel

    if (minLevel >= maxLevel) {
      throw new InvalidLevelRangeException(minLevel, maxLevel)
    }

    // 4. Actualizar el framework
    const updated = await this.frameworksRepository.update(id, {
      ...dto,
      minLevel,
      maxLevel,
    })

    return framework
  }
}
