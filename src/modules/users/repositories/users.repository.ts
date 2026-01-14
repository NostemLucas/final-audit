import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TransactionService, AuditService } from '@core/database'
import { BaseRepository } from '@core/repositories/base.repository'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { IUsersRepository } from './users-repository.interface'
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '@core/dtos'
import { FindUsersDto } from '../dtos/find-users.dto'
import { UserResponseDto } from '../dtos/user-response.dto'

@Injectable()
export class UsersRepository
  extends BaseRepository<UserEntity>
  implements IUsersRepository
{
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { email: email.toLowerCase() },
      relations: ['organization'],
    })
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { username: username.toLowerCase() },
      relations: ['organization'],
    })
  }

  /**
   * Busca un usuario por email o username e incluye el password
   * Usado para autenticación
   *
   * @param usernameOrEmail - Email o username (case-insensitive)
   * @returns Usuario con password, o null si no existe
   */
  async findByUsernameOrEmailWithPassword(
    usernameOrEmail: string,
  ): Promise<UserEntity | null> {
    const normalized = usernameOrEmail.toLowerCase()

    return await this.getRepo()
      .createQueryBuilder('user')
      .addSelect('user.password') // Incluir password explícitamente
      .where('LOWER(user.email) = :identifier', { identifier: normalized })
      .orWhere('LOWER(user.username) = :identifier', { identifier: normalized })
      .getOne()
  }

  async findByCI(ci: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { ci },
      relations: ['organization'],
    })
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.getRepo().find({
      where: { organizationId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    })
  }

  // Validaciones de unicidad
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.email = :email', {
        email: email.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.username = :username', {
        username: username.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByCI(ci: string, excludeId?: string): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.ci = :ci', { ci })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async countUsersByOrganization(organizationId: string): Promise<number> {
    return await this.getRepo().count({
      where: { organizationId },
    })
  }

  /**
   * Paginación con filtros avanzados usando QueryBuilder
   *
   * ✅ Búsqueda OR en múltiples campos
   * ✅ Filtro en array (roles)
   * ✅ Relaciones (organization)
   * ✅ Reutiliza PaginatedResponseBuilder del padre
   *
   * @param findUsersDto - DTO con filtros y paginación
   * @returns Paginación con UserEntity (sin mapear)
   */
  async paginateWithFilters(
    findUsersDto: FindUsersDto,
  ): Promise<PaginatedResponse<UserEntity>> {
    const {
      sortOrder = 'DESC',
      all = false,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      onlyActive,
      organizationId,
      status,
      role,
      search,
    } = findUsersDto

    // Crear query builder con relación
    const queryBuilder = this.getRepo()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')

    // ===== FILTROS COMPLEJOS =====

    // Búsqueda OR (names, lastNames, email, username, ci)
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.names) LIKE :search OR ' +
          'LOWER(user.lastNames) LIKE :search OR ' +
          'LOWER(user.email) LIKE :search OR ' +
          'LOWER(user.username) LIKE :search OR ' +
          'user.ci LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      )
    }

    // Filtro en array (roles con ANY)
    if (role) {
      queryBuilder.andWhere(':role = ANY(user.roles)', { role })
    }

    // Filtros simples
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status })
    }

    if (organizationId) {
      queryBuilder.andWhere('user.organizationId = :organizationId', {
        organizationId,
      })
    }

    if (onlyActive) {
      queryBuilder.andWhere('user.status = :activeStatus', {
        activeStatus: UserStatus.ACTIVE,
      })
    }

    // Aplicar ordenamiento
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder)

    // ===== PAGINACIÓN =====

    // Si all=true, devolver todos los registros
    if (all) {
      const allRecords = await queryBuilder.getMany()
      // ✅ Reutiliza el builder del padre
      return PaginatedResponseBuilder.createAll(allRecords)
    }

    // Paginación normal
    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    // ✅ Reutiliza el builder del padre
    return PaginatedResponseBuilder.create(data, total, page, limit)
  }

  /**
   * Paginación con filtros Y mapeo a UserResponseDto
   *
   * @param findUsersDto - DTO con filtros y paginación
   * @returns Paginación con UserResponseDto (datos mapeados)
   */
  async paginateAndMap(
    findUsersDto: FindUsersDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    // 1. Obtener datos paginados con filtros
    const paginatedResult = await this.paginateWithFilters(findUsersDto)

    // 2. Mapear cada UserEntity a UserResponseDto
    const mappedData = paginatedResult.data.map((user) =>
      this.mapToResponseDto(user),
    )

    // 3. Retornar la misma estructura con datos mapeados
    return {
      ...paginatedResult,
      data: mappedData,
    }
  }

  /**
   * Mapea UserEntity a UserResponseDto
   * @private
   */
  private mapToResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      isActive: user.status === UserStatus.ACTIVE,
      createdAt: user.createdAt.toISOString(),
      roles: user.roles,
      organizationName: user.organization?.name || '',
      imageUrl: user.image || null,
    }
  }
}
