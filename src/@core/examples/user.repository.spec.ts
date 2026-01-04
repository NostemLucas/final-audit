import { Test, TestingModule } from '@nestjs/testing'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ClsService } from 'nestjs-cls'
import { UserRepository } from './user.repository'
import { User } from './user.entity'

describe('UserRepository', () => {
  let userRepository: UserRepository
  let mockRepository: jest.Mocked<Repository<User>>
  let mockClsService: jest.Mocked<ClsService>
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<User>>

  beforeEach(async () => {
    // Mock del QueryBuilder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    } as any

    // Mock del Repository de TypeORM
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      target: User,
    } as any

    // Mock del ClsService
    mockClsService = {
      get: jest.fn().mockReturnValue(undefined), // Sin transacción por defecto
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile()

    userRepository = module.get<UserRepository>(UserRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ============================================
  // IMPORTANTE: Solo probamos métodos personalizados
  // NO probamos save(), findById(), etc. porque esos
  // ya están probados en base.repository.spec.ts
  // ============================================

  describe('findByEmail() - método personalizado', () => {
    it('should find user by email', async () => {
      // Arrange
      const email = 'test@example.com'
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      } as User

      mockRepository.findOne.mockResolvedValue(user)

      // Act
      const result = await userRepository.findByEmail(email)

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      })
      expect(result).toBe(user)
    })

    it('should return null when user with email not found', async () => {
      // Arrange
      const email = 'notfound@example.com'
      mockRepository.findOne.mockResolvedValue(null)

      // Act
      const result = await userRepository.findByEmail(email)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findActiveUsers() - método personalizado', () => {
    it('should find all active users (not soft deleted)', async () => {
      // Arrange
      const activeUsers = [
        { id: '1', email: 'user1@test.com', name: 'User 1', deletedAt: null },
        { id: '2', email: 'user2@test.com', name: 'User 2', deletedAt: null },
      ] as User[]

      mockQueryBuilder.getMany.mockResolvedValue(activeUsers)

      // Act
      const result = await userRepository.findActiveUsers()

      // Assert
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.deletedAt IS NULL')
      expect(mockQueryBuilder.getMany).toHaveBeenCalled()
      expect(result).toBe(activeUsers)
    })

    it('should return empty array when no active users', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([])

      // Act
      const result = await userRepository.findActiveUsers()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('updateEmail() - método personalizado', () => {
    it('should update user email and return true', async () => {
      // Arrange
      const userId = '123'
      const newEmail = 'newemail@test.com'

      mockRepository.update.mockResolvedValue({ affected: 1 } as any)

      // Act
      const result = await userRepository.updateEmail(userId, newEmail)

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        email: newEmail,
      })
      expect(result).toBe(true)
    })

    it('should return false when user not found', async () => {
      // Arrange
      const userId = '999'
      const newEmail = 'newemail@test.com'

      mockRepository.update.mockResolvedValue({ affected: 0 } as any)

      // Act
      const result = await userRepository.updateEmail(userId, newEmail)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when update affects multiple rows (edge case)', async () => {
      // Arrange
      const userId = '123'
      const newEmail = 'newemail@test.com'

      mockRepository.update.mockResolvedValue({ affected: undefined } as any)

      // Act
      const result = await userRepository.updateEmail(userId, newEmail)

      // Assert
      expect(result).toBe(false)
    })
  })

  // ============================================
  // Test de integración con CLS (opcional)
  // ============================================

  describe('CLS integration', () => {
    it('should use transaction repository when EntityManager is in CLS', async () => {
      // Arrange
      const email = 'test@example.com'
      const user = { id: '1', email, name: 'Test' } as User

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(user),
        }),
      }

      mockClsService.get.mockReturnValue(mockEntityManager)

      // Act
      const result = await userRepository.findByEmail(email)

      // Assert
      expect(mockClsService.get).toHaveBeenCalled()
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(User)
      expect(result).toBe(user)
    })
  })
})
