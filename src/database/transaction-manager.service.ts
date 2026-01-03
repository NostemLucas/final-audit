import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager } from 'typeorm'
import { AsyncLocalStorage } from 'async_hooks'

@Injectable()
export class TransactionManager {
  private static asyncLocalStorage = new AsyncLocalStorage<
    EntityManager | undefined
  >()

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Obtiene el EntityManager actual del contexto transaccional
   * Si no hay transacción activa, retorna undefined
   */
  static getCurrentEntityManager(): EntityManager | undefined {
    return this.asyncLocalStorage.getStore()
  }

  /**
   * Ejecuta una operación dentro de una transacción
   * Todos los repositorios dentro de esta función usarán el mismo EntityManager
   */
  async runInTransaction<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return await this.dataSource.transaction(async (entityManager) => {
      return await TransactionManager.asyncLocalStorage.run(
        entityManager,
        async () => {
          return await operation(entityManager)
        },
      )
    })
  }

  /**
   * Ejecuta una operación con un EntityManager específico en el contexto
   * Útil para testing o casos especiales
   */
  async runWithEntityManager<T>(
    entityManager: EntityManager,
    operation: () => Promise<T>,
  ): Promise<T> {
    return await TransactionManager.asyncLocalStorage.run(
      entityManager,
      async () => {
        return await operation()
      },
    )
  }
}
