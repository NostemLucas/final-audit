import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, ILike } from 'typeorm'
import { TransactionService, AuditService } from '@core/database'
import { BaseRepository } from '@core/repositories/base.repository'
import { UserEntity } from '../entities/user.entity'
import { IUsersRepository } from './users-repository.interface'
import { PaginatedResponse } from '@core/dtos'
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
   * Paginación de usuarios con filtros avanzados
   *
   * Soporta búsqueda por:
   * - search: names, lastNames, email, username, ci (búsqueda de texto libre)
   * - status: estado del usuario (active, inactive, suspended) - opcional
   * - organizationId: filtrar por organización
   *
   * NOTA: El filtro por 'role' requiere QueryBuilder ya que roles es un array.
   * Si necesitas filtrar por rol, usa el método findByOrganization y filtra en memoria,
   * o crea un método específico con QueryBuilder.
   *
   * @param query - DTO con filtros y opciones de paginación
   * @returns Datos paginados con UserResponseDto
   */
  async paginateUsers(
    query: FindUsersDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { search, status, organizationId } = query

    // 1. Definimos los filtros fijos (AND)
    const baseFilter: FindOptionsWhere<UserEntity> = {}

    if (status) baseFilter.status = status
    if (organizationId) baseFilter.organizationId = organizationId

    // 2. Definimos la lógica de búsqueda (OR) combinada con el filtro base
    // Si hay búsqueda, creamos un array de condiciones. Si no, usamos solo el baseFilter.
    let where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[] =
      baseFilter

    if (search) {
      const searchTerm = ILike(`%${search}%`)
      // Campos donde queremos buscar
      const searchFields: Array<keyof UserEntity> = [
        'names',
        'lastNames',
        'email',
        'username',
        'ci',
      ]

      where = searchFields.map((field) => ({
        ...baseFilter,
        [field]: searchTerm,
      }))
    }

    return this.paginateWithMapper<UserResponseDto>(
      query,
      (user) => ({
        id: user.id,
        fullName: user.fullName,
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        username: user.username,
        status: user.status,
        roles: user.roles,
        organizationName: user.organization?.name ?? 'Sin Organización',
        imageUrl: user.image,
      }),
      {
        where,
        relations: { organization: true },
      },
    )
  }
}
