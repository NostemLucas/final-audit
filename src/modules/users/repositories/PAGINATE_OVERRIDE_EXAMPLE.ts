/**
 * EJEMPLO ALTERNATIVO: Sobrescribir el método paginate del padre
 *
 * Este archivo es solo un ejemplo de referencia.
 * Muestra cómo sobrescribir completamente el método paginate() en lugar de crear métodos separados.
 *
 * ⚠️ NO USAR DIRECTAMENTE - Solo para referencia
 */

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TransactionService, AuditService } from '@core/database'
import { BaseRepository } from '@core/repositories/base.repository'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { PaginatedResponse, PaginatedResponseBuilder } from '@core/dtos'
import { FindUsersDto } from '../dtos/find-users.dto'
import { UserResponseDto } from '../dtos/user-response.dto'

@Injectable()
export class UsersRepositoryExample extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * ENFOQUE 2: Sobrescribir el método paginate del padre
   *
   * Ventajas:
   * - Mantiene la misma firma de método (compatibilidad)
   * - Centraliza toda la lógica de paginación
   *
   * Desventajas:
   * - Menos flexible (un solo método para todo)
   * - Puede volverse complejo si hay muchas variaciones
   */
  override async paginate(
    query: FindUsersDto,
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
    } = query

    // Si no hay filtros específicos, usar el método del padre (optimización)
    if (!search && !status && !role && !organizationId && !onlyActive) {
      return await super.paginate(query)
    }

    // Crear query builder con filtros personalizados
    const queryBuilder = this.getRepo()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')

    // Aplicar filtros
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

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status })
    }

    if (role) {
      queryBuilder.andWhere(':role = ANY(user.roles)', { role })
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

    // Si all=true, devolver todos los registros
    if (all) {
      const allRecords = await queryBuilder.getMany()
      // ✅ Reutilizar el builder del padre para mantener consistencia
      return PaginatedResponseBuilder.createAll(allRecords)
    }

    // Paginación normal
    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    // ✅ Reutilizar el builder del padre para mantener consistencia
    return PaginatedResponseBuilder.create(data, total, page, limit)
  }

  /**
   * Método adicional para devolver datos mapeados a DTO
   */
  async paginateAsDto(
    query: FindUsersDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const paginatedResult = await this.paginate(query)

    const mappedData = paginatedResult.data.map((user) =>
      this.mapToResponseDto(user),
    )

    return {
      ...paginatedResult,
      data: mappedData,
    }
  }

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
