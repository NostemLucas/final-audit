import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager } from 'typeorm'
import { ClsService } from 'nestjs-cls'

/**
 * Clave para almacenar el EntityManager en CLS
 */
export const ENTITY_MANAGER_KEY = 'ENTITY_MANAGER'

/**
 * Servicio para manejar transacciones usando CLS (Continuation Local Storage)
 * Permite usar transacciones sin tener que pasar el EntityManager manualmente
 */
@Injectable()
export class TransactionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  /**
   * Obtiene el EntityManager actual del contexto CLS
   * Si hay una transacción activa, retorna su EntityManager
   * Si no, retorna undefined
   */
  getCurrentEntityManager(): EntityManager | undefined {
    return this.cls.get<EntityManager>(ENTITY_MANAGER_KEY)
  }

  /**
   * Ejecuta una operación dentro de una transacción
   * El EntityManager se guarda automáticamente en CLS y está disponible
   * para todos los repositorios dentro del scope
   *
   * @example
   * ```typescript
   * await this.transactionService.runInTransaction(async () => {
   *   // Los repositorios usarán automáticamente el EntityManager de la transacción
   *   await this.userRepository.save(user)
   *   await this.profileRepository.save(profile)
   * })
   * ```
   */
  async runInTransaction<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return await this.dataSource.transaction(async (entityManager) => {
      // Guardar el EntityManager en CLS
      return await this.cls.run(async () => {
        this.cls.set(ENTITY_MANAGER_KEY, entityManager)
        return await operation(entityManager)
      })
    })
  }

  /**
   * Ejecuta una operación con un EntityManager específico en CLS
   * Útil para testing o casos especiales donde ya tienes un EntityManager
   */
  async runWithEntityManager<T>(
    entityManager: EntityManager,
    operation: () => Promise<T>,
  ): Promise<T> {
    return await this.cls.run(async () => {
      this.cls.set(ENTITY_MANAGER_KEY, entityManager)
      return await operation()
    })
  }
}
