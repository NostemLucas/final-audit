import { Repository, EntityManager, Entity, Column } from 'typeorm'
import { BaseRepository } from './base.repository'
import { BaseEntity } from '@core/entities'
import { TransactionService, AuditService } from '@core/database'

/**
 * Tests para BaseRepository - Solo lógica de conmutación de repositorio
 *
 * IMPORTANTE: Solo probamos getRepo() que es NUESTRA lógica.
 * NO probamos métodos CRUD (create, save, findById) porque solo delegan a getRepo().
 *
 * Si getRepo() funciona correctamente, todos los métodos funcionarán.
 */

@Entity('test_entities')
class TestEntity extends BaseEntity {
  @Column()
  name: string
}

// Repository con método público para testing
class TestRepository extends BaseRepository<TestEntity> {
  constructor(
    repository: Repository<TestEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  // Exponemos getRepo para probar directamente
  public getRepoPublic(): Repository<TestEntity> {
    return this.getRepo()
  }
}

// Tipos para mocks (evita 'any' y errores de ESLint)
type MockRepository = Pick<Repository<TestEntity>, 'target'>
type MockTransactionService = Pick<
  TransactionService,
  'getCurrentEntityManager'
>
type MockEntityManager = Pick<EntityManager, 'getRepository'>

type MockAuditService = Pick<
  AuditService,
  'getCurrentUserId' | 'applyAudit' | 'getUpdateAudit'
>

describe('BaseRepository - Conmutación de Repositorio con TransactionService', () => {
  let testRepository: TestRepository
  let mockRepository: MockRepository
  let mockTransactionService: jest.Mocked<MockTransactionService>
  let mockEntityManager: jest.Mocked<MockEntityManager>
  let mockAuditService: jest.Mocked<MockAuditService>
  let mockTransactionRepository: MockRepository

  beforeEach(() => {
    mockRepository = { target: TestEntity }
    mockTransactionRepository = { target: TestEntity }

    mockEntityManager = {
      getRepository: jest.fn().mockReturnValue(mockTransactionRepository),
    }

    mockTransactionService = {
      getCurrentEntityManager: jest.fn().mockReturnValue(undefined),
    }

    // Inicializamos el mock del AuditService
    mockAuditService = {
      getCurrentUserId: jest.fn().mockReturnValue('test-user-id'),
      applyAudit: jest.fn(),
      getUpdateAudit: jest.fn().mockReturnValue({ updatedBy: 'test-user-id' }),
    }

    testRepository = new TestRepository(
      mockRepository as Repository<TestEntity>,
      mockTransactionService as unknown as TransactionService,
      mockAuditService as unknown as AuditService, // Pasamos el mock aquí
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
  // ============================================
  // ESCENARIO A: Sin transacción (repositorio por defecto)
  // ============================================

  describe('Escenario A: Sin EntityManager en CLS', () => {
    it('debe usar el repositorio por defecto cuando CLS devuelve undefined', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(undefined)

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(mockTransactionService.getCurrentEntityManager).toHaveBeenCalled()
      expect(repo).toBe(mockRepository)
    })

    it('debe usar el repositorio por defecto cuando CLS devuelve null', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        null as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(repo).toBe(mockRepository)
    })
  })

  // ============================================
  // ESCENARIO B: Con transacción (repositorio transaccional)
  // ============================================

  describe('Escenario B: Con EntityManager en CLS', () => {
    it('debe usar el repositorio transaccional cuando CLS tiene EntityManager', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        mockEntityManager as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(mockTransactionService.getCurrentEntityManager).toHaveBeenCalled()
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestEntity)
      expect(repo).toBe(mockTransactionRepository)
    })

    it('debe solicitar el repositorio usando el target correcto', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        mockEntityManager as unknown as EntityManager,
      )

      // Act
      testRepository.getRepoPublic()

      // Assert - Verificar que usa el target de la entidad
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestEntity)
    })
  })

  // ============================================
  // EDGE CASES: Contexto CLS inválido
  // ============================================

  describe('Edge Cases: CLS con valores inválidos', () => {
    it('debe usar repositorio por defecto cuando CLS devuelve objeto sin getRepository', () => {
      // Arrange - EntityManager inválido sin método getRepository
      const invalidEntityManager = {
        someOtherMethod: jest.fn(),
      }
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        invalidEntityManager as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert - Fallback a repositorio por defecto
      expect(repo).toBe(mockRepository)
    })

    it('debe usar repositorio por defecto cuando getRepository no es función', () => {
      // Arrange - EntityManager con getRepository que no es función
      const invalidEntityManager = {
        getRepository: 'not a function',
      }
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        invalidEntityManager as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert - Fallback a repositorio por defecto
      expect(repo).toBe(mockRepository)
    })

    it('debe usar repositorio por defecto cuando CLS devuelve objeto vacío', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(
        {} as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(repo).toBe(mockRepository)
    })
  })

  // ============================================
  // VERIFICACIÓN: Múltiples llamadas consecutivas
  // ============================================

  describe('Verificación: Comportamiento en múltiples llamadas', () => {
    it('debe consultar CLS en cada invocación de getRepo', () => {
      // Arrange
      mockTransactionService.getCurrentEntityManager.mockReturnValue(undefined)

      // Act - Llamar múltiples veces
      testRepository.getRepoPublic()
      testRepository.getRepoPublic()
      testRepository.getRepoPublic()

      // Assert - Debe consultar TransactionService cada vez (no cachea)
      expect(
        mockTransactionService.getCurrentEntityManager,
      ).toHaveBeenCalledTimes(3)
    })

    it('debe conmutar correctamente entre repositorio por defecto y transaccional', () => {
      // Arrange - Primera llamada sin transacción
      mockTransactionService.getCurrentEntityManager.mockReturnValueOnce(
        undefined,
      )

      // Act & Assert - Primera llamada: repositorio por defecto
      let repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockRepository)

      // Arrange - Segunda llamada CON transacción
      mockTransactionService.getCurrentEntityManager.mockReturnValueOnce(
        mockEntityManager as unknown as EntityManager,
      )

      // Act & Assert - Segunda llamada: repositorio transaccional
      repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockTransactionRepository)

      // Arrange - Tercera llamada SIN transacción nuevamente
      mockTransactionService.getCurrentEntityManager.mockReturnValueOnce(
        undefined,
      )

      // Act & Assert - Tercera llamada: repositorio por defecto otra vez
      repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockRepository)

      // Verificar que se consultó CLS 3 veces
      expect(
        mockTransactionService.getCurrentEntityManager,
      ).toHaveBeenCalledTimes(3)
    })
  })

  describe('Integración con AuditService', () => {
    it('debe estar definido el auditService en el repositorio', () => {
      expect(testRepository['auditService']).toBeDefined()
    })
  })
})
