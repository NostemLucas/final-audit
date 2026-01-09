import { Repository, EntityManager, Entity, Column } from 'typeorm'
import { ClsService } from 'nestjs-cls'
import { BaseRepository } from './base.repository'
import { BaseEntity } from '@core/entities'
import { ENTITY_MANAGER_KEY } from '@core/database'

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
  constructor(repository: Repository<TestEntity>, cls: ClsService) {
    super(repository, cls)
  }

  // Exponemos getRepo para probar directamente
  public getRepoPublic(): Repository<TestEntity> {
    return this.getRepo()
  }
}

// Tipos para mocks (evita 'any' y errores de ESLint)
type MockRepository = Pick<Repository<TestEntity>, 'target'>
type MockClsService = Pick<ClsService, 'get'>
type MockEntityManager = Pick<EntityManager, 'getRepository'>

describe('BaseRepository - Conmutación de Repositorio (CLS)', () => {
  let testRepository: TestRepository
  let mockRepository: MockRepository
  let mockClsService: jest.Mocked<MockClsService>
  let mockEntityManager: jest.Mocked<MockEntityManager>
  let mockTransactionRepository: MockRepository

  beforeEach(() => {
    // Mocks con tipado correcto
    mockRepository = {
      target: TestEntity,
    }

    mockTransactionRepository = {
      target: TestEntity,
    }

    mockEntityManager = {
      getRepository: jest.fn().mockReturnValue(mockTransactionRepository),
    }

    mockClsService = {
      get: jest.fn().mockReturnValue(undefined),
    }

    testRepository = new TestRepository(
      mockRepository as Repository<TestEntity>,
      mockClsService as unknown as ClsService,
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
      mockClsService.get.mockReturnValue(undefined)

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
      expect(repo).toBe(mockRepository)
    })

    it('debe usar el repositorio por defecto cuando CLS devuelve null', () => {
      // Arrange
      mockClsService.get.mockReturnValue(null as unknown as EntityManager)

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
      mockClsService.get.mockReturnValue(
        mockEntityManager as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert
      expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestEntity)
      expect(repo).toBe(mockTransactionRepository)
    })

    it('debe solicitar el repositorio usando el target correcto', () => {
      // Arrange
      mockClsService.get.mockReturnValue(
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
      mockClsService.get.mockReturnValue(
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
      mockClsService.get.mockReturnValue(
        invalidEntityManager as unknown as EntityManager,
      )

      // Act
      const repo = testRepository.getRepoPublic()

      // Assert - Fallback a repositorio por defecto
      expect(repo).toBe(mockRepository)
    })

    it('debe usar repositorio por defecto cuando CLS devuelve objeto vacío', () => {
      // Arrange
      mockClsService.get.mockReturnValue({} as unknown as EntityManager)

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
      mockClsService.get.mockReturnValue(undefined)

      // Act - Llamar múltiples veces
      testRepository.getRepoPublic()
      testRepository.getRepoPublic()
      testRepository.getRepoPublic()

      // Assert - Debe consultar CLS cada vez (no cachea)
      expect(mockClsService.get).toHaveBeenCalledTimes(3)
      expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
    })

    it('debe conmutar correctamente entre repositorio por defecto y transaccional', () => {
      // Arrange - Primera llamada sin transacción
      mockClsService.get.mockReturnValueOnce(undefined)

      // Act & Assert - Primera llamada: repositorio por defecto
      let repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockRepository)

      // Arrange - Segunda llamada CON transacción
      mockClsService.get.mockReturnValueOnce(
        mockEntityManager as unknown as EntityManager,
      )

      // Act & Assert - Segunda llamada: repositorio transaccional
      repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockTransactionRepository)

      // Arrange - Tercera llamada SIN transacción nuevamente
      mockClsService.get.mockReturnValueOnce(undefined)

      // Act & Assert - Tercera llamada: repositorio por defecto otra vez
      repo = testRepository.getRepoPublic()
      expect(repo).toBe(mockRepository)

      // Verificar que se consultó CLS 3 veces
      expect(mockClsService.get).toHaveBeenCalledTimes(3)
    })
  })
})
