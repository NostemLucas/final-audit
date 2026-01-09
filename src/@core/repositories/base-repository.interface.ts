import { BaseEntity } from '@core/entities'
import type {
  DeepPartial,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { PaginationDto, PaginatedResponse } from '@core/dtos'

export interface IBaseRepository<T extends BaseEntity> {
  create(data: DeepPartial<T>): T
  createMany(data: DeepPartial<T>[]): T[]
  save(data: DeepPartial<T>): Promise<T>
  saveMany(data: DeepPartial<T>[]): Promise<T[]>
  findById(id: string): Promise<T | null>
  findByIds(ids: Array<string>): Promise<T[]>
  findAll(options?: FindManyOptions<T>): Promise<T[]>
  findOne(
    where: FindOptionsWhere<T>,
    options?: FindOneOptions<T>,
  ): Promise<T | null>
  findWhere(
    where: FindOptionsWhere<T>,
    options?: FindManyOptions<T>,
  ): Promise<T[]>
  count(where?: FindOptionsWhere<T>): Promise<number>
  exists(where: FindOptionsWhere<T>): Promise<boolean>
  paginate(query: PaginationDto): Promise<PaginatedResponse<T>>
  update(id: string, partialEntity: QueryDeepPartialEntity<T>): Promise<boolean>
  patch(entity: T, partialEntity: DeepPartial<T>): Promise<T>
  softDelete(id: string): Promise<boolean>
  recover(id: string): Promise<boolean>
}
