import {
  Repository,
  SelectQueryBuilder,
  UpdateResult,
  DeleteResult,
  ObjectLiteral,
} from 'typeorm'
import { BaseEntity } from '@core/entities'

/**
 * Type helper para crear mocks type-safe de Repository
 */
export type MockRepository<T extends ObjectLiteral> = {
  [K in keyof Repository<T>]: Repository<T>[K] extends (...args: any[]) => any
    ? jest.MockedFunction<Repository<T>[K]>
    : Repository<T>[K]
}

/**
 * Tipo de retorno de createMockRepository
 * Define los métodos que son mockeados
 */
export interface TestMockRepository<T extends BaseEntity> {
  create: jest.MockedFunction<(entityLike: any) => T>
  save: jest.MockedFunction<(entity: any | any[]) => Promise<T | T[]>>
  findOne: jest.MockedFunction<(options?: any) => Promise<T | null>>
  find: jest.MockedFunction<(options?: any) => Promise<T[]>>
  findAndCount: jest.MockedFunction<(options?: any) => Promise<[T[], number]>>
  update: jest.MockedFunction<(criteria: any, partialEntity: any) => Promise<any>>
  delete: jest.MockedFunction<(criteria: any) => Promise<any>>
  softDelete: jest.MockedFunction<(criteria: any) => Promise<any>>
  restore: jest.MockedFunction<(criteria: any) => Promise<any>>
  remove: jest.MockedFunction<(entity: any) => Promise<T>>
  merge: jest.MockedFunction<(mergeIntoEntity: T, ...entityLikes: any[]) => T>
  count: jest.MockedFunction<(options?: any) => Promise<number>>
  createQueryBuilder: jest.MockedFunction<(alias?: string) => any>
  target: new () => T
  manager: any
  metadata: any
  queryRunner: any
}

/**
 * Factory para crear mocks de Repository de TypeORM
 * Esto es más robusto que mockear manualmente cada método
 */
export function createMockRepository<T extends BaseEntity>(
  target: new () => T,
): TestMockRepository<T> {
  return {
    // Métodos comunes mockeados
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    remove: jest.fn(),
    merge: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),

    // Target (necesario para getRepository)
    target,

    // Otros métodos que normalmente no se usan pero TypeORM los tiene
    manager: {} as any,
    metadata: {} as any,
    queryRunner: undefined,
  }
}

/**
 * Factory para crear mocks de QueryBuilder
 */
export function createMockQueryBuilder<
  T extends ObjectLiteral,
>(): jest.Mocked<SelectQueryBuilder<T>> {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
  } as any
}

/**
 * Helper para crear UpdateResult mock
 */
export function createUpdateResult(affected: number = 1): UpdateResult {
  return {
    affected,
    raw: {},
    generatedMaps: [],
  }
}

/**
 * Helper para crear DeleteResult mock
 */
export function createDeleteResult(affected: number = 1): DeleteResult {
  return {
    affected,
    raw: {},
  }
}
