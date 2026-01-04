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
import { ClsService } from 'nestjs-cls'
import { ENTITY_MANAGER_KEY } from '@core/database'

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
   * Este método se llama automáticamente en todos los métodos del repository
   * No es necesario pasarle parámetros
   */
  protected getRepo(): Repository<T> {
    const contextEntityManager = this.cls.get<EntityManager>(ENTITY_MANAGER_KEY)

    return (
      contextEntityManager?.getRepository(this.repository.target) ??
      this.repository
    )
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

  async findAll(): Promise<T[]> {
    return await this.getRepo().find()
  }

  // ---------- Métodos de paginación ----------
  /*   async paginate(options: PaginationDto): Promise<[T[], number]> {
    const { limit, skip } = options
    const findOptions: FindManyOptions<T> = {
      take: limit,
      skip: skip,
    }
    return this.getRepo().findAndCount(findOptions)
  }
 */
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
