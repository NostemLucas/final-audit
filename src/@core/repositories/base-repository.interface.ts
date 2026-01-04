import { BaseEntity } from '@core/entities'
import type { DeepPartial, EntityManager } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

export interface IBaseRepository<T extends BaseEntity> {
  create(data: DeepPartial<T> ): T
  createMany(data: DeepPartial<T>[] ): T[]
  save(data: DeepPartial<T> ): Promise<T>
  saveMany(data: DeepPartial<T>[] ): Promise<T[]>
  findById(id: string ): Promise<T | null>
  findAll(): Promise<T[]>
  findByIds(ids: Array<string> ): Promise<T[]>
  update(
    id: string,
    partialEntity: QueryDeepPartialEntity<T>
  ): Promise<boolean>
  patch(
    entity: T,
    partialEntity: DeepPartial<T>,
  ): Promise<T>
  softDelete(id: string ): Promise<boolean>
  recover(id: string ): Promise<boolean>
}
