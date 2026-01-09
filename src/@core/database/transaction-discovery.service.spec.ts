import { Test, TestingModule } from '@nestjs/testing'
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
} from '@nestjs/core'
import { Injectable } from '@nestjs/common'

// Mock del LoggerService ANTES de importar TransactionDiscoveryService
jest.mock('@core/logger', () => ({
  LoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  })),
}))

import { TransactionDiscoveryService } from './transaction-discovery.service'
import { TransactionService } from './transaction.service'
import { Transactional } from './transactional.decorator'
import { LoggerService } from '@core/logger'

/**
 * Servicio de prueba con métodos @Transactional
 */
@Injectable()
class TestService {
  public callCount = 0

  @Transactional()
  transactionalMethod(): Promise<string> {
    this.callCount++
    return Promise.resolve('success')
  }

  normalMethod(): Promise<string> {
    return Promise.resolve('normal')
  }
}

describe('TransactionDiscoveryService', () => {
  let module: TestingModule
  let discoveryService: TransactionDiscoveryService
  let testService: TestService
  let transactionService: TransactionService

  beforeEach(async () => {
    // Mock del TransactionService

    const mockTransactionService = {
      runInTransaction: jest.fn(
        async (cb: () => Promise<unknown>) => await cb(),
      ),
    }

    module = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        TransactionDiscoveryService,
        TestService,
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        LoggerService,
        DiscoveryService,
        MetadataScanner,
      ],
    }).compile()

    discoveryService = module.get<TransactionDiscoveryService>(
      TransactionDiscoveryService,
    )
    testService = module.get<TestService>(TestService)
    transactionService = module.get<TransactionService>(TransactionService)

    // Ejecutar el onModuleInit manualmente para escanear
    discoveryService.onModuleInit()
  })

  afterEach(async () => {
    await module.close()
  })

  describe('Discovery de métodos @Transactional()', () => {
    it('debe encontrar y envolver métodos marcados con @Transactional', async () => {
      // Arrange & Act
      const result = await testService.transactionalMethod()

      // Assert
      expect(result).toBe('success')
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transactionService.runInTransaction).toHaveBeenCalledTimes(1)
    })

    it('NO debe envolver métodos sin @Transactional', async () => {
      // Arrange & Act
      const result = await testService.normalMethod()

      // Assert
      expect(result).toBe('normal')
      // No debe llamar a runInTransaction
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transactionService.runInTransaction).not.toHaveBeenCalled()
    })

    it('debe mantener el contexto "this" correcto', async () => {
      // Arrange
      expect(testService.callCount).toBe(0)

      // Act
      await testService.transactionalMethod()

      // Assert
      expect(testService.callCount).toBe(1)
    })

    it('debe llamar múltiples veces sin problemas', async () => {
      // Act
      await testService.transactionalMethod()
      await testService.transactionalMethod()
      await testService.transactionalMethod()

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transactionService.runInTransaction).toHaveBeenCalledTimes(3)
      expect(testService.callCount).toBe(3)
    })
  })

  describe('Manejo de errores', () => {
    beforeEach(() => {
      // Configurar mock para simular error en transacción
      jest
        .spyOn(transactionService, 'runInTransaction')
        .mockRejectedValueOnce(new Error('Transaction failed'))
    })

    it('debe propagar errores de transacción correctamente', async () => {
      // Arrange & Act & Assert
      await expect(testService.transactionalMethod()).rejects.toThrow(
        'Transaction failed',
      )
    })
  })
})
