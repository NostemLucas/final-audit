import { BaseRepository } from '@core/repositories'
import { OrganizationEntity } from '../entities'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TransactionService } from '@core/database'
import { IOrganizationRepository } from './organization-repository.interface'
import { Injectable } from '@nestjs/common'

@Injectable()
export class OrganizationRepository
  extends BaseRepository<OrganizationEntity>
  implements IOrganizationRepository
{
  constructor(
    @InjectRepository(OrganizationEntity)
    repository: Repository<OrganizationEntity>,
    transactionService: TransactionService,
  ) {
    super(repository, transactionService)
  }

  async findByNit(nit: string): Promise<OrganizationEntity | null> {
    return await this.getRepo().findOne({
      where: { nit },
    })
  }

  async findByName(name: string): Promise<OrganizationEntity | null> {
    return await this.getRepo().findOne({
      where: { name },
    })
  }

  async findAllActive(): Promise<OrganizationEntity[]> {
    return await this.getRepo().find({
      where: { isActive: true },
      relations: ['users'],
      order: { createdAt: 'DESC' },
    })
  }

  async findActiveById(id: string): Promise<OrganizationEntity | null> {
    return await this.getRepo().findOne({
      where: { id, isActive: true },
      relations: ['users'],
    })
  }

  async findActiveByNit(nit: string): Promise<OrganizationEntity | null> {
    return await this.getRepo().findOne({
      where: { nit, isActive: true },
      relations: ['users'],
    })
  }

  /**
   * Verifica si existe una organización activa con el ID dado
   * Útil para validaciones sin necesidad de cargar la entidad completa
   */
  async existsActiveById(id: string): Promise<boolean> {
    const count = await this.getRepo().count({
      where: { id, isActive: true },
    })
    return count > 0
  }

  async countActiveUsers(organizationId: string): Promise<number> {
    return await this.getRepo()
      .createQueryBuilder('org')
      .leftJoin('org.users', 'user')
      .where('org.id = :id', { id: organizationId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount()
  }

  async hardDelete(id: string): Promise<void> {
    await this.getRepo().delete(id)
  }

  /**
   * Busca organizaciones con filtros personalizados
   * Retorna tupla con [data, total]
   */
  async findWithFilters(
    filters: import('./organization-repository.interface').OrganizationFilters,
    page?: number,
    limit?: number,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<[OrganizationEntity[], number]> {
    const queryBuilder = this.getRepo()
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.users', 'users')

    // Filtro de búsqueda de texto
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      queryBuilder.andWhere(
        '(org.name ILIKE :search OR org.nit ILIKE :search OR org.description ILIKE :search OR org.email ILIKE :search)',
        { search: searchTerm },
      )
    }

    // Filtro por estado activo
    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('org.isActive = :isActive', {
        isActive: filters.isActive,
      })
    }

    // Filtro por logo
    if (filters.hasLogo !== undefined) {
      if (filters.hasLogo) {
        queryBuilder.andWhere('org.logoUrl IS NOT NULL')
      } else {
        queryBuilder.andWhere('org.logoUrl IS NULL')
      }
    }

    // Ordenamiento
    queryBuilder.orderBy(`org.${sortBy}`, sortOrder)

    // Paginación (si se proporciona)
    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit
      queryBuilder.skip(skip).take(limit)
    }

    return await queryBuilder.getManyAndCount()
  }
}
