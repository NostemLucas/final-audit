import { Repository, EntityManager, Entity, Column } from 'typeorm'
import { ClsService } from 'nestjs-cls'
import { BaseRepository } from './base.repository'
import { BaseEntity } from '@core/entities'
import { ENTITY_MANAGER_KEY } from '@core/database'
import {
  createMockRepository,
  createUpdateResult,
  TestMockRepository,
} from './__tests__/helpers/mock-repository.factory'

// Entidad dummy para testing
@Entity('test_entities')
class TestEntity extends BaseEntity {
  @Column()
  name: string
}

// Repository concreto para testing
class TestRepository extends BaseRepository<TestEntity> {
  constructor(repository: Repository<TestEntity>, cls: ClsService) {
    super(repository, cls)
  }
}

describe('BaseRepository', () => {
  let testRepository: TestRepository
  let mockRepository: TestMockRepository<TestEntity>
  let mockClsService: { get: jest.MockedFunction<ClsService['get']> }
  let mockEntityManager: { getRepository: jest.MockedFunction<any> }
  let mockTransactionRepository: TestMockRepository<TestEntity>

  beforeEach(async () => {
    // Usar factory para crear mocks robustos
    mockRepository = createMockRepository(TestEntity)
    mockTransactionRepository = createMockRepository(TestEntity)

    // Mock del EntityManager
    mockEntityManager = {
      getRepository: jest.fn().mockReturnValue(mockTransactionRepository),
    }

    // Mock del ClsService (sin run - no se usa en BaseRepository)
    mockClsService = {
      get: jest.fn().mockReturnValue(undefined), // Sin transacción por defecto
    }

    // Crear instancia manualmente para evitar problemas con DI
    testRepository = new TestRepository(
      mockRepository as unknown as Repository<TestEntity>,
      mockClsService as unknown as ClsService,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ============================================
  // IMPORTANTE: Testear COMPORTAMIENTO, no implementación
  // No accedemos a métodos privados con "as any"
  // ============================================

  describe('create()', () => {
    it('should create entity using default repository', () => {
      // Arrange
      const data = { name: 'Test Entity' }
      const createdEntity = { id: '1', name: 'Test Entity' } as TestEntity

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.create.mockReturnValue(createdEntity)

      // Act
      const result = testRepository.create(data)

      // Assert
      expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
      expect(mockRepository.create).toHaveBeenCalledWith(data)
      expect(result).toBe(createdEntity)
    })

    it('should create entity using transaction repository when CLS has EntityManager', () => {
      // Arrange
      const data = { name: 'Test Entity' }
      const createdEntity = { id: '1', name: 'Test Entity' } as TestEntity

      mockClsService.get.mockReturnValue(mockEntityManager)
      mockTransactionRepository.create.mockReturnValue(createdEntity)

      // Act
      const result = testRepository.create(data)

      // Assert
      expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestEntity)
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(data)
      expect(result).toBe(createdEntity)
    })
  })

  describe('save()', () => {
    it('should save entity using default repository', async () => {
      // Arrange
      const data = { name: 'Test Entity' }
      const createdEntity = { id: '1', name: 'Test Entity' } as TestEntity
      const savedEntity = { id: '1', name: 'Test Entity' } as TestEntity

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.create.mockReturnValue(createdEntity)
      mockRepository.save.mockResolvedValue(savedEntity)

      // Act
      const result = await testRepository.save(data)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntity)
      expect(result).toBe(savedEntity)
    })

    it('should save entity using transaction repository when in CLS', async () => {
      // Arrange
      const data = { name: 'Test Entity' }
      const createdEntity = { id: '1', name: 'Test Entity' } as TestEntity
      const savedEntity = { id: '1', name: 'Test Entity' } as TestEntity

      mockClsService.get.mockReturnValue(mockEntityManager)
      mockTransactionRepository.create.mockReturnValue(createdEntity)
      mockTransactionRepository.save.mockResolvedValue(savedEntity)

      // Act
      const result = await testRepository.save(data)

      // Assert
      expect(mockTransactionRepository.save).toHaveBeenCalledWith(createdEntity)
      expect(result).toBe(savedEntity)
    })
  })

  describe('saveMany()', () => {
    it('should save multiple entities', async () => {
      // Arrange
      const data = [{ name: 'Entity 1' }, { name: 'Entity 2' }]
      const savedEntities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' },
      ] as TestEntity[]

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.save.mockResolvedValue(savedEntities)

      // Act
      const result = await testRepository.saveMany(data)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(data)
      expect(result).toBe(savedEntities)
    })
  })

  describe('findById()', () => {
    it('should find entity by id using default repository', async () => {
      // Arrange
      const id = '123'
      const entity = { id: '123', name: 'Test' } as TestEntity

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.findOne.mockResolvedValue(entity)

      // Act
      const result = await testRepository.findById(id)

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      })
      expect(result).toBe(entity)
    })

    it('should find entity by id using transaction repository', async () => {
      // Arrange
      const id = '123'
      const entity = { id: '123', name: 'Test' } as TestEntity

      mockClsService.get.mockReturnValue(mockEntityManager)
      mockTransactionRepository.findOne.mockResolvedValue(entity)

      // Act
      const result = await testRepository.findById(id)

      // Assert
      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      })
      expect(result).toBe(entity)
    })

    it('should return null when entity not found', async () => {
      // Arrange
      const id = '999'
      mockClsService.get.mockReturnValue(undefined)
      mockRepository.findOne.mockResolvedValue(null)

      // Act
      const result = await testRepository.findById(id)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findAll()', () => {
    it('should find all entities', async () => {
      // Arrange
      const entities = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ] as TestEntity[]

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.find.mockResolvedValue(entities)

      // Act
      const result = await testRepository.findAll()

      // Assert
      expect(mockRepository.find).toHaveBeenCalled()
      expect(result).toBe(entities)
    })
  })

  describe('update()', () => {
    it('should update entity and return true when successful', async () => {
      // Arrange
      const id = '123'
      const data = { name: 'Updated' }

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.update.mockResolvedValue(createUpdateResult(1))

      // Act
      const result = await testRepository.update(id, data)

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(id, data)
      expect(result).toBe(true)
    })

    it('should return false when no entity was affected', async () => {
      // Arrange
      const id = '123'
      const data = { name: 'Updated' }

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.update.mockResolvedValue(createUpdateResult(0))

      // Act
      const result = await testRepository.update(id, data)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when affected is undefined', async () => {
      // Arrange
      const id = '123'
      const data = { name: 'Updated' }

      mockClsService.get.mockReturnValue(undefined)
      // Simular un UpdateResult con affected undefined (edge case)
      mockRepository.update.mockResolvedValue({
        affected: undefined,
        raw: {},
        generatedMaps: [],
      })

      // Act
      const result = await testRepository.update(id, data)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('softDelete()', () => {
    it('should soft delete entity and return true', async () => {
      // Arrange
      const id = '123'

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.softDelete.mockResolvedValue(createUpdateResult(1))

      // Act
      const result = await testRepository.softDelete(id)

      // Assert
      expect(mockRepository.softDelete).toHaveBeenCalledWith(id)
      expect(result).toBe(true)
    })

    it('should return false when entity not found', async () => {
      // Arrange
      const id = '999'

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.softDelete.mockResolvedValue(createUpdateResult(0))

      // Act
      const result = await testRepository.softDelete(id)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('recover()', () => {
    it('should recover soft deleted entity', async () => {
      // Arrange
      const id = '123'

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.restore.mockResolvedValue(createUpdateResult(1))

      // Act
      const result = await testRepository.recover(id)

      // Assert
      expect(mockRepository.restore).toHaveBeenCalledWith(id)
      expect(result).toBe(true)
    })
  })

  describe('patch()', () => {
    it('should merge and save entity', async () => {
      // Arrange
      const entity = { id: '1', name: 'Original' } as TestEntity
      const partial = { name: 'Updated' }
      const merged = { id: '1', name: 'Updated' } as TestEntity
      const saved = { id: '1', name: 'Updated' } as TestEntity

      mockClsService.get.mockReturnValue(undefined)
      mockRepository.merge.mockReturnValue(merged)
      mockRepository.save.mockResolvedValue(saved)

      // Act
      const result = await testRepository.patch(entity, partial)

      // Assert
      expect(mockRepository.merge).toHaveBeenCalledWith(entity, partial)
      expect(mockRepository.save).toHaveBeenCalledWith(merged)
      expect(result).toBe(saved)
    })
  })

  // ============================================
  // Edge Cases (sugeridos por el usuario)
  // ============================================

  describe('CLS edge cases', () => {
    it('should fallback to default repository when CLS returns invalid value', async () => {
      // Arrange
      const data = { name: 'Test' }
      const createdEntity = { id: '1', name: 'Test' } as TestEntity

      // CLS devuelve algo que no es un EntityManager válido
      mockClsService.get.mockReturnValue({} as unknown as EntityManager)
      mockRepository.create.mockReturnValue(createdEntity)

      // Act
      const result = testRepository.create(data)

      // Assert
      // Debería usar el repository por defecto como fallback
      expect(mockRepository.create).toHaveBeenCalled()
      expect(result).toBe(createdEntity)
    })

    it('should fallback to default repository when CLS returns null', async () => {
      // Arrange
      mockClsService.get.mockReturnValue(null as unknown as EntityManager)
      mockRepository.find.mockResolvedValue([])

      // Act
      await testRepository.findAll()

      // Assert
      expect(mockRepository.find).toHaveBeenCalled()
    })

    it('should handle EntityManager without getRepository method gracefully', async () => {
      // Arrange
      const invalidEntityManager = {
        someMethod: jest.fn(),
      } as unknown as EntityManager
      mockClsService.get.mockReturnValue(invalidEntityManager)
      mockRepository.find.mockResolvedValue([])

      // Act
      await testRepository.findAll()

      // Assert
      // Debería usar el repository por defecto como fallback
      expect(mockRepository.find).toHaveBeenCalled()
    })
  })

  // ============================================
  // Integration Tests - CLS Behavior
  // ============================================

  describe('CLS integration', () => {
    it('should consistently use same repository within single operation', async () => {
      // Arrange
      mockClsService.get.mockReturnValue(mockEntityManager)
      mockTransactionRepository.findOne.mockResolvedValue(null)

      // Act
      await testRepository.findById('1')
      await testRepository.findById('2')

      // Assert
      // Debería usar el mismo EntityManager para ambas llamadas
      expect(mockEntityManager.getRepository).toHaveBeenCalledTimes(2)
      expect(mockTransactionRepository.findOne).toHaveBeenCalledTimes(2)
    })

    it('should switch between default and transaction repository correctly', async () => {
      // Arrange
      const entity = { id: '1', name: 'Test' } as TestEntity

      // Primera llamada: sin transacción
      mockClsService.get.mockReturnValueOnce(undefined)
      mockRepository.findOne.mockResolvedValueOnce(entity)

      // Segunda llamada: con transacción
      mockClsService.get.mockReturnValueOnce(mockEntityManager)
      mockTransactionRepository.findOne.mockResolvedValueOnce(entity)

      // Act
      await testRepository.findById('1')
      await testRepository.findById('2')

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1)
      expect(mockTransactionRepository.findOne).toHaveBeenCalledTimes(1)
    })
  })
})
