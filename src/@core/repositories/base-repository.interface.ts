import { BaseEntity } from '@core/entities'
import type { DeepPartial, EntityManager } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

export interface IBaseRepository<T extends BaseEntity> {
  create(data: DeepPartial<T>, entityManager?: EntityManager): T
  createMany(data: DeepPartial<T>[], entityManager?: EntityManager): T[]
  save(data: DeepPartial<T>, entityManager?: EntityManager): Promise<T>
  saveMany(data: DeepPartial<T>[], entityManager?: EntityManager): Promise<T[]>
  findById(id: string, entityManager?: EntityManager): Promise<T | null>
  findAll(entityManager?: EntityManager): Promise<T[]>
  findByIds(ids: Array<string>, entityManager?: EntityManager): Promise<T[]>
  update(
    id: string,
    partialEntity: QueryDeepPartialEntity<T>,
    entityManager?: EntityManager,
  ): Promise<boolean>
  patch(
    entity: T,
    partialEntity: DeepPartial<T>,
    entityManager?: EntityManager,
  ): Promise<T>
  softDelete(id: string, entityManager?: EntityManager): Promise<boolean>
  recover(id: string, entityManager?: EntityManager): Promise<boolean>
}
