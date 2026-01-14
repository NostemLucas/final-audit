import { Injectable } from '@nestjs/common'
import { MaturityFrameworksRepository } from '../../../repositories'
import type { QueryMaturityFrameworkDto } from '../../../dtos'
import type { MaturityFrameworkEntity } from '../../../entities/maturity-framework.entity'

/**
 * Find Maturity Frameworks Use Case
 *
 * Lista frameworks de madurez con filtros opcionales
 */
@Injectable()
export class FindFrameworksUseCase {
  constructor(
    private readonly frameworksRepository: MaturityFrameworksRepository,
  ) {}

  /**
   * Ejecuta la búsqueda de frameworks
   *
   * @param query - Parámetros de búsqueda
   * @returns Lista de frameworks
   */
  async execute(
    query: QueryMaturityFrameworkDto = {},
  ): Promise<MaturityFrameworkEntity[]> {
    // Si se filtra por activos, usar método específico
    if (query.isActive !== undefined) {
      if (query.isActive) {
        return await this.frameworksRepository.findActive()
      }
      // Si se buscan inactivos
      return await this.frameworksRepository.findAll({
        where: { isActive: false },
        order: { name: 'ASC' },
      })
    }

    // Sin filtros, devolver todos
    return await this.frameworksRepository.findAll({
      order: { name: 'ASC' },
    })
  }
}
