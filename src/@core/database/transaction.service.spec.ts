import { Test, TestingModule } from '@nestjs/testing'
import { TransactionService, ENTITY_MANAGER_KEY } from './transaction.service'
import { DataSource, EntityManager } from 'typeorm'
import { ClsService } from 'nestjs-cls'

describe('TransactionService', () => {
  let service: TransactionService
  let dataSource: DataSource
  let clsService: ClsService
  let mockEntityManager: EntityManager
  let mockTransaction: jest.Mock

  beforeEach(async () => {
    // Mock EntityManager
    mockEntityManager = {
      getRepository: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as EntityManager

    // Mock transaction callback
    mockTransaction = jest.fn(
      async (callback: (em: EntityManager) => Promise<unknown>) => {
        return await callback(mockEntityManager)
      },
    )

    // Mock DataSource
    const mockDataSource = {
      transaction: mockTransaction,
    }

    // Mock ClsService
    const mockClsService = {
      get: jest.fn(),
      set: jest.fn(),
      run: jest.fn(async (callback: () => Promise<unknown>) => {
        return await callback()
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile()

    service = module.get<TransactionService>(TransactionService)
    dataSource = module.get<DataSource>(DataSource)
    clsService = module.get<ClsService>(ClsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentEntityManager', () => {
    it('debe retornar undefined cuando no hay transacción activa', () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(undefined)

      // Act
      const result = service.getCurrentEntityManager()

      // Assert
      expect(result).toBeUndefined()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
    })

    it('debe retornar el EntityManager cuando hay transacción activa', () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(mockEntityManager)

      // Act
      const result = service.getCurrentEntityManager()

      // Assert
      expect(result).toBe(mockEntityManager)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
    })
  })

  describe('isTransactionActive', () => {
    it('debe retornar false cuando no hay transacción activa', () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(undefined)

      // Act
      const result = service.isTransactionActive()

      // Assert
      expect(result).toBe(false)
    })

    it('debe retornar true cuando hay transacción activa', () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(mockEntityManager)

      // Act
      const result = service.isTransactionActive()

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('runInTransaction', () => {
    it('debe crear una nueva transacción cuando no hay una activa', async () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(undefined)
      const operation = jest.fn(() => Promise.resolve('result'))

      // Act
      const result = await service.runInTransaction(operation)

      // Assert
      expect(result).toBe('result')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.run).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.set).toHaveBeenCalledWith(
        ENTITY_MANAGER_KEY,
        mockEntityManager,
      )
      expect(operation).toHaveBeenCalledWith(mockEntityManager)
    })

    it('debe reutilizar la transacción existente cuando ya hay una activa', async () => {
      // Arrange
      const existingManager = mockEntityManager
      jest.spyOn(clsService, 'get').mockReturnValue(existingManager)
      const operation = jest.fn(() => Promise.resolve('result'))

      // Act
      const result = await service.runInTransaction(operation)

      // Assert
      expect(result).toBe('result')
      // NO debe crear una nueva transacción
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dataSource.transaction).not.toHaveBeenCalled()
      // Debe usar el EntityManager existente
      expect(operation).toHaveBeenCalledWith(existingManager)
    })

    it('debe propagar errores correctamente', async () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(undefined)
      const error = new Error('Test error')
      const operation = jest.fn(() => Promise.reject(error))

      // Act & Assert
      await expect(service.runInTransaction(operation)).rejects.toThrow(
        'Test error',
      )
      expect(operation).toHaveBeenCalled()
    })

    it('debe manejar transacciones anidadas correctamente', async () => {
      // Arrange
      let getCallCount = 0
      jest.spyOn(clsService, 'get').mockImplementation(() => {
        // Primera llamada: no hay transacción
        // Segunda llamada: sí hay transacción (después de set)
        getCallCount++
        return getCallCount === 1 ? undefined : mockEntityManager
      })

      const innerOperation = jest.fn(() => Promise.resolve('inner-result'))
      const outerOperation = jest.fn(async (em: EntityManager) => {
        // Esta es la transacción externa
        expect(em).toBe(mockEntityManager)

        // Llamar a una transacción anidada
        return await service.runInTransaction(innerOperation)
      })

      // Act
      const result = await service.runInTransaction(outerOperation)

      // Assert
      expect(result).toBe('inner-result')
      // Solo debe crear UNA transacción (la externa)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
      // Ambas operaciones deben ejecutarse
      expect(outerOperation).toHaveBeenCalled()
      expect(innerOperation).toHaveBeenCalled()
      // La operación interna debe recibir el mismo EntityManager
      expect(innerOperation).toHaveBeenCalledWith(mockEntityManager)
    })

    it('debe mantener el contexto CLS a través de múltiples operaciones', async () => {
      // Arrange
      jest.spyOn(clsService, 'get').mockReturnValue(undefined)

      const operation1 = jest.fn(() => Promise.resolve('op1'))
      const operation2 = jest.fn(() => Promise.resolve('op2'))
      const operation3 = jest.fn(() => Promise.resolve('op3'))

      const combinedOperation = jest.fn(async () => {
        // Verificar que el EntityManager es el mismo en cada operación
        await operation1()
        await operation2()
        await operation3()
        return 'combined-result'
      })

      // Act
      const result = await service.runInTransaction(combinedOperation)

      // Assert
      expect(result).toBe('combined-result')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.set).toHaveBeenCalledWith(
        ENTITY_MANAGER_KEY,
        mockEntityManager,
      )
      expect(operation1).toHaveBeenCalled()
      expect(operation2).toHaveBeenCalled()
      expect(operation3).toHaveBeenCalled()
    })
  })

  describe('runWithEntityManager', () => {
    it('debe ejecutar operación con el EntityManager proporcionado', async () => {
      // Arrange
      const customManager = {} as EntityManager
      const operation = jest.fn(() => Promise.resolve('result'))

      // Act
      const result = await service.runWithEntityManager(
        customManager,
        operation,
      )

      // Assert
      expect(result).toBe('result')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.run).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(clsService.set).toHaveBeenCalledWith(
        ENTITY_MANAGER_KEY,
        customManager,
      )
      expect(operation).toHaveBeenCalled()
    })

    it('debe propagar errores correctamente', async () => {
      // Arrange
      const customManager = {} as EntityManager
      const error = new Error('Test error')
      const operation = jest.fn(() => Promise.reject(error))

      // Act & Assert
      await expect(
        service.runWithEntityManager(customManager, operation),
      ).rejects.toThrow('Test error')
    })
  })

  describe('Escenarios de integración', () => {
    it('debe permitir rollback cuando hay error en transacción anidada', async () => {
      // Arrange
      let getCallCount = 0
      jest.spyOn(clsService, 'get').mockImplementation(() => {
        getCallCount++
        return getCallCount === 1 ? undefined : mockEntityManager
      })

      const error = new Error('Nested transaction error')
      const innerOperation = jest.fn(() => Promise.reject(error))
      const outerOperation = jest.fn(async () => {
        await service.runInTransaction(innerOperation)
      })

      // Act & Assert
      await expect(service.runInTransaction(outerOperation)).rejects.toThrow(
        'Nested transaction error',
      )

      // Verificar que la transacción externa se ejecutó
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dataSource.transaction).toHaveBeenCalled()
      // Verificar que la operación interna intentó ejecutarse
      expect(innerOperation).toHaveBeenCalled()
    })

    it('debe manejar múltiples niveles de anidación', async () => {
      // Arrange
      let getCallCount = 0
      jest.spyOn(clsService, 'get').mockImplementation(() => {
        getCallCount++
        // Solo la primera llamada no tiene transacción
        return getCallCount === 1 ? undefined : mockEntityManager
      })

      const level3 = jest.fn(() => Promise.resolve('level3-result'))
      const level2 = jest.fn(async () => {
        return await service.runInTransaction(level3)
      })
      const level1 = jest.fn(async () => {
        return await service.runInTransaction(level2)
      })

      // Act
      const result = await service.runInTransaction(level1)

      // Assert
      expect(result).toBe('level3-result')
      // Solo debe crear UNA transacción (la más externa)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
      // Todas las operaciones deben ejecutarse
      expect(level1).toHaveBeenCalled()
      expect(level2).toHaveBeenCalled()
      expect(level3).toHaveBeenCalled()
    })
  })
})
