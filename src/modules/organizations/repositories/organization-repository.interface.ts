import { IBaseRepository } from '@core/repositories'
import { OrganizationEntity } from '../entities'

export interface OrganizationFilters {
  search?: string
  isActive?: boolean
  hasLogo?: boolean
}

export interface IOrganizationRepository extends IBaseRepository<OrganizationEntity> {
  findByNit(nit: string): Promise<OrganizationEntity | null>
  findByName(name: string): Promise<OrganizationEntity | null>
  findAllActive(): Promise<OrganizationEntity[]>
  findActiveById(id: string): Promise<OrganizationEntity | null>
  findActiveByNit(nit: string): Promise<OrganizationEntity | null>
  existsActiveById(id: string): Promise<boolean>
  countActiveUsers(organizationId: string): Promise<number>
  hardDelete(id: string): Promise<void>

  // Búsqueda con filtros personalizados
  findWithFilters(
    filters: OrganizationFilters,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<[OrganizationEntity[], number]>
}
