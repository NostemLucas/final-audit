import { Injectable, Inject } from '@nestjs/common'
import { PaginatedResponse, PaginatedResponseBuilder } from '@core/dtos'
import { OrganizationEntity } from '../../entities/organization.entity'
import { FindOrganizationsDto } from '../../dtos'
import { ORGANIZATION_REPOSITORY } from '../../repositories'
import type {
  IOrganizationRepository,
  OrganizationFilters,
} from '../../repositories'

/**
 * Caso de uso: Buscar organizaciones con filtros y paginación
 *
 * Responsabilidades:
 * - Construir filtros desde query params
 * - Aplicar paginación o devolver todos los resultados
 * - Retornar respuesta paginada estructurada
 */
@Injectable()
export class FindOrganizationsWithFiltersUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(
    query: FindOrganizationsDto,
  ): Promise<PaginatedResponse<OrganizationEntity>> {
    const {
      page = 1,
      limit = 10,
      all = false,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      isActive,
      hasLogo,
    } = query

    // Construir filtros
    const filters: OrganizationFilters = {
      search,
      isActive,
      hasLogo,
    }

    // Si all=true, devolver todos los registros
    if (all) {
      const [data] = await this.organizationRepository.findWithFilters(
        filters,
        undefined,
        undefined,
        sortBy,
        sortOrder,
      )
      return PaginatedResponseBuilder.createAll(data)
    }

    // Paginación normal
    const [data, total] = await this.organizationRepository.findWithFilters(
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    )

    return PaginatedResponseBuilder.create(data, total, page, limit)
  }
}
