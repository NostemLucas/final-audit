import { BaseEntity } from '@core/entities'
import {
  type DeepPartial,
  type FindManyOptions,
  type EntityManager,
  type FindOptionsWhere,
  type Repository,
  In,
} from 'typeorm'
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { IBaseRepository } from './base-repository.interface'
import { TransactionManager } from 'src/database/transaction-manager.service'

export abstract class BaseRepository<
  T extends BaseEntity,
> implements IBaseRepository<T> {
  protected constructor(protected readonly repository: Repository<T>) {}

  /**
   * Obtiene el repositorio correcto según el contexto:
   * 1. Si se pasa entityManager explícitamente, lo usa
   * 2. Si hay una transacción activa en el contexto (AsyncLocalStorage), la usa
   * 3. Si no, usa el repositorio por defecto
   */
  protected getRepo(entityManager?: EntityManager): Repository<T> {
    const contextEntityManager =
      entityManager ?? TransactionManager.getCurrentEntityManager()
    return (
      contextEntityManager?.getRepository(this.repository.target) ??
      this.repository
    )
  }

  // ---------- Métodos de creación ----------
  create(data: DeepPartial<T>, entityManager?: EntityManager): T {
    return this.getRepo(entityManager).create(data)
  }

  createMany(data: DeepPartial<T>[], entityManager?: EntityManager): T[] {
    return this.getRepo(entityManager).create(data)
  }

  // ---------- Métodos de guardado ----------
  async save(data: DeepPartial<T>, entityManager?: EntityManager): Promise<T> {
    const createdEntity = this.create(data, entityManager)
    return await this.getRepo(entityManager).save(createdEntity)
  }

  async saveMany(
    data: DeepPartial<T>[],
    entityManager?: EntityManager,
  ): Promise<T[]> {
    return await this.getRepo(entityManager).save(data)
  }

  // ---------- Métodos de búsqueda ----------
  async findById(id: string, entityManager?: EntityManager): Promise<T | null> {
    return await this.getRepo(entityManager).findOne({
      where: { id } as FindOptionsWhere<T>,
    })
  }

  async findByIds(
    ids: Array<string>,
    entityManager?: EntityManager,
  ): Promise<T[]> {
    return await this.getRepo(entityManager).find({
      where: {
        id: In(ids),
      },
    } as FindManyOptions<T>)
  }

  async findAll(entityManager?: EntityManager): Promise<T[]> {
    return await this.getRepo(entityManager).find()
  }

  // ---------- Métodos de paginación ----------
  /*   async paginate(
    options: PaginationDto,
    entityManager?: EntityManager,
  ): Promise<[T[], number]> {
    const { limit, skip } = options
    const findOptions: FindManyOptions<T> = {
      take: limit,
      skip: skip,
    }
    return this.getRepo(entityManager).findAndCount(findOptions)
  }
 */
  // ---------- Métodos de actualización ----------
  async update(
    id: string,
    partialEntity: QueryDeepPartialEntity<T>,
    entityManager?: EntityManager,
  ): Promise<boolean> {
    const result = await this.getRepo(entityManager).update(id, partialEntity)
    console.log(result)
    return (result.affected ?? 0) > 0
  }

  async patch(
    entity: T,
    partialEntity: DeepPartial<T>,
    entityManager?: EntityManager,
  ): Promise<T> {
    const updatedEntity = this.getRepo(entityManager).merge(
      entity,
      partialEntity,
    )
    return this.getRepo(entityManager).save(updatedEntity)
  }

  // ---------- Métodos de eliminación ----------

  async softDelete(
    id: string,
    entityManager?: EntityManager,
  ): Promise<boolean> {
    const result = await this.getRepo(entityManager).softDelete(id)
    return (result.affected ?? 0) > 0
  }

  async recover(id: string, entityManager?: EntityManager): Promise<boolean> {
    const result = await this.getRepo(entityManager).restore(id)
    return (result.affected ?? 0) > 0
  }
}
