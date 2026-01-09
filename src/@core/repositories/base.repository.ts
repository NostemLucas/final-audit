import { BaseEntity } from '@core/entities'
import {
  type DeepPartial,
  type FindManyOptions,
  type FindOneOptions,
  type EntityManager,
  type FindOptionsWhere,
  type Repository,
  In,
} from 'typeorm'
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { IBaseRepository } from './base-repository.interface'
import { ClsService } from 'nestjs-cls'
import { ENTITY_MANAGER_KEY } from '@core/database'
import {
  PaginationDto,
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '@core/dtos'

export abstract class BaseRepository<
  T extends BaseEntity,
> implements IBaseRepository<T> {
  protected constructor(
    protected readonly repository: Repository<T>,
    protected readonly cls: ClsService,
  ) {}

  /**
   * Obtiene el repositorio correcto según el contexto:
   * 1. Si hay una transacción activa en CLS, usa su EntityManager
   * 2. Si no, usa el repositorio por defecto
   *
   */
  protected getRepo(): Repository<T> {
    const contextEntityManager = this.cls.get<EntityManager>(ENTITY_MANAGER_KEY)

    // Si hay un EntityManager en CLS y tiene el método getRepository, usarlo
    if (
      contextEntityManager &&
      typeof contextEntityManager.getRepository === 'function'
    ) {
      return contextEntityManager.getRepository(this.repository.target)
    }

    // En cualquier otro caso, usar el repository por defecto
    return this.repository
  }

  // ---------- Métodos de creación ----------
  create(data: DeepPartial<T>): T {
    return this.getRepo().create(data)
  }

  createMany(data: DeepPartial<T>[]): T[] {
    return this.getRepo().create(data)
  }

  // ---------- Métodos de guardado ----------
  async save(data: DeepPartial<T>): Promise<T> {
    const createdEntity = this.create(data)
    return await this.getRepo().save(createdEntity)
  }

  async saveMany(data: DeepPartial<T>[]): Promise<T[]> {
    return await this.getRepo().save(data)
  }

  // ---------- Métodos de búsqueda ----------
  async findById(id: string): Promise<T | null> {
    return await this.getRepo().findOne({
      where: { id } as FindOptionsWhere<T>,
    })
  }

  async findByIds(ids: Array<string>): Promise<T[]> {
    return await this.getRepo().find({
      where: {
        id: In(ids),
      },
    } as FindManyOptions<T>)
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.getRepo().find(options)
  }

  // Búsqueda genérica
  async findOne(
    where: FindOptionsWhere<T>,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    return await this.getRepo().findOne({
      where,
      ...options,
    })
  }

  async findWhere(
    where: FindOptionsWhere<T>,
    options?: FindManyOptions<T>,
  ): Promise<T[]> {
    return await this.getRepo().find({
      where,
      ...options,
    })
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return await this.getRepo().count({ where })
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.count(where)
    return count > 0
  }

  async paginate(query: PaginationDto): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 10, all = false, sortBy, sortOrder } = query

    // Si all=true, devolver todos los registros con estructura estándar
    if (all) {
      const allRecords = await this.findAll({
        order: sortBy ? { [sortBy]: sortOrder || 'DESC' } : undefined,
      } as FindManyOptions<T>)

      return PaginatedResponseBuilder.createAll(allRecords)
    }

    // Paginación normal
    const skip = (page - 1) * limit

    const findOptions: FindManyOptions<T> = {
      take: limit,
      skip,
      order: sortBy ? { [sortBy]: sortOrder || 'DESC' } : undefined,
    } as FindManyOptions<T>

    const [data, total] = await this.getRepo().findAndCount(findOptions)

    return PaginatedResponseBuilder.create(data, total, page, limit)
  }

  // ---------- Métodos de actualización ----------
  async update(
    id: string,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<boolean> {
    const result = await this.getRepo().update(id, partialEntity)
    return (result.affected ?? 0) > 0
  }

  async patch(entity: T, partialEntity: DeepPartial<T>): Promise<T> {
    const updatedEntity = this.getRepo().merge(entity, partialEntity)
    return this.getRepo().save(updatedEntity)
  }

  // ---------- Métodos de eliminación ----------

  async softDelete(id: string): Promise<boolean> {
    const result = await this.getRepo().softDelete(id)
    return (result.affected ?? 0) > 0
  }

  async recover(id: string): Promise<boolean> {
    const result = await this.getRepo().restore(id)
    return (result.affected ?? 0) > 0
  }
}
