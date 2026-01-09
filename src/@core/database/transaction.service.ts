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
   * Verifica si hay una transacción activa en el contexto actual
   */
  isTransactionActive(): boolean {
    return this.getCurrentEntityManager() !== undefined
  }

  /**
   * Ejecuta una operación dentro de una transacción
   * El EntityManager se guarda automáticamente en CLS y está disponible
   * para todos los repositorios dentro del scope
   *
   * IMPORTANTE: Maneja transacciones anidadas correctamente.
   * Si ya existe una transacción activa, la reutiliza en lugar de crear una nueva.
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
    // Detectar si ya hay una transacción activa
    const existingManager = this.getCurrentEntityManager()

    if (existingManager) {
      // Ya hay una transacción activa, reutilizarla (transacción anidada)
      return await operation(existingManager)
    }

    // No hay transacción activa, crear una nueva
    return await this.dataSource.transaction(async (entityManager) => {
      return await this.cls.run(async () => {
        this.cls.set(ENTITY_MANAGER_KEY, entityManager)
        return await operation(entityManager)
      })
    })
  }

  /**
   * Ejecuta una operación usando un EntityManager existente
   * IMPORTANTE: Este método NO crea una transacción, solo establece
   * el EntityManager en el contexto CLS
   *
   * ⚠️ CASOS DE USO (muy específicos):
   *
   * 1. Integración con código legacy que ya tiene un EntityManager
   * 2. Testing - cuando necesitas mockear el EntityManager
   * 3. Migraciones o scripts que ya manejan transacciones manualmente
   *
   * ❌ NO USES este método si:
   * - Quieres iniciar una nueva transacción (usa runInTransaction())
   * - Quieres commit/rollback automático (usa runInTransaction())
   * - Es código de aplicación normal (usa @Transactional() o runInTransaction())
   *
   * @example
   * ```typescript
   * // Caso raro: Ya tienes un EntityManager externo
   * const externalEM = await connection.manager
   *
   * await this.transactionService.runWithEntityManager(externalEM, async () => {
   *   // Los repositorios usarán externalEM
   *   await this.userRepository.save(user)
   *   // ⚠️ NO hace commit automático - debes manejarlo tú
   * })
   *
   * // Debes hacer commit manualmente
   * await externalEM.save(...)
   * ```
   *
   * @param entityManager - EntityManager existente que quieres usar
   * @param operation - Operación a ejecutar con ese EntityManager
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
