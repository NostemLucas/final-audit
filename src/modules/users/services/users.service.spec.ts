import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { UserValidator } from '../validators/user.validator'
import { UserFactory } from '../factories/user.factory'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserNotFoundException } from '../exceptions'
import { FilesService } from '@core/files'
import { createMock } from '@core/testing'
import { TEST_USERS, createTestUser } from '../__tests__/fixtures/user.fixtures'
import type { IUsersRepository } from '../repositories'
import { USERS_REPOSITORY } from '../repositories'
import { Role, UserStatus } from '../entities/user.entity'

/**
 * ✅ UNIT TESTS - UsersService (with Jest Mocks)
 *
 * Testing approach:
 * - Mock Repository: Solo mockeamos comportamiento necesario
 * - Mock Validator: Mockeamos validaciones
 * - Real Factory: Usamos factory real para probar normalizaciones y hash de passwords
 * - Mock FilesService: Mockeamos dependencia externa
 *
 * Ventajas sobre Fake Repository:
 * - ~240 líneas menos de código de test
 * - Tests más rápidos (sin lógica de fake)
 * - Tests más claros (ves exactamente qué se llama)
 * - Enfoque: Probar SOLO la lógica de orquestación del servicio
 */
describe('UsersService', () => {
  let service: UsersService
  let mockRepository: jest.Mocked<IUsersRepository>
  let mockValidator: jest.Mocked<UserValidator>
  let factory: UserFactory // ✅ Real factory para probar hash de passwords
  let mockFilesService: jest.Mocked<FilesService>

  beforeEach(async () => {
    // ✅ Crear mocks simples con Jest
    mockRepository = createMock<IUsersRepository>({
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByCI: jest.fn(),
      findByOrganization: jest.fn(),
      softDelete: jest.fn(),
    })

    mockValidator = createMock<UserValidator>({
      validateUniqueConstraints: jest.fn(),
      validateUniqueEmail: jest.fn(),
      validateUniqueUsername: jest.fn(),
      validateUniqueCI: jest.fn(),
      ensureUserExists: jest.fn(),
    })

    mockFilesService = createMock<FilesService>({
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
    })

    // ✅ Usar factory REAL para probar hash de passwords
    factory = new UserFactory()

    // Crear módulo de testing
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: UserValidator,
          useValue: mockValidator,
        },
        {
          provide: UserFactory,
          useValue: factory,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create user with password hashing', async () => {
      // Arrange
      const dto: CreateUserDto = {
        names: 'Nuevo',
        lastNames: 'Usuario',
        email: 'nuevo@test.com',
        username: 'nuevousuario',
        ci: '55555555',
        password: 'NewPass123!', // Plain password
        organizationId: 'org-1', // ✅ Requerido
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      const savedUser = createTestUser({
        id: 'user-123',
        email: dto.email,
        password: 'HASHED_PASSWORD', // Ya hasheado por factory
      })

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue(savedUser)

      // Act
      const result = await service.create(dto)

      // Assert
      expect(mockValidator.validateUniqueConstraints).toHaveBeenCalledWith(
        dto.email,
        dto.username,
        dto.ci,
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          username: dto.username,
          ci: dto.ci,
        }),
      )
      expect(result).toEqual(savedUser)
    })

    it('should propagate validation error when email is duplicate', async () => {
      // Arrange
      const dto: CreateUserDto = {
        names: 'Duplicate',
        lastNames: 'User',
        email: TEST_USERS.ADMIN.email, // ❌ Duplicate email
        username: 'newusername',
        ci: '66666666',
        password: 'Pass123!',
        organizationId: 'org-1', // ✅ Requerido
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      const validationError = new Error('Email already exists')
      mockValidator.validateUniqueConstraints.mockRejectedValue(validationError)

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow('Email already exists')

      // ✅ Verificamos que NO se llamó a save (validación falló antes)
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all users from repository', async () => {
      // Arrange
      const users = [TEST_USERS.ADMIN, TEST_USERS.AUDITOR, TEST_USERS.USUARIO]
      mockRepository.findAll.mockResolvedValue(users)

      // Act
      const result = await service.findAll()

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual(users)
    })

    it('should return empty array when no users exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return user by id', async () => {
      // Arrange
      const user = TEST_USERS.ADMIN
      mockRepository.findById.mockResolvedValue(user)

      // Act
      const result = await service.findOne(user.id)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(user.id)
      expect(result).toEqual(user)
    })

    it('should throw UserNotFoundException when not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      )
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const user = TEST_USERS.AUDITOR
      mockRepository.findByEmail.mockResolvedValue(user)

      // Act
      const result = await service.findByEmail(user.email)

      // Assert
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(user.email)
      expect(result).toEqual(user)
    })

    it('should return null when user not found', async () => {
      // Arrange
      mockRepository.findByEmail.mockResolvedValue(null)

      // Act
      const result = await service.findByEmail('nonexistent@test.com')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      // Arrange
      const user = TEST_USERS.ADMIN
      mockRepository.findByUsername.mockResolvedValue(user)

      // Act
      const result = await service.findByUsername(user.username)

      // Assert
      expect(mockRepository.findByUsername).toHaveBeenCalledWith(user.username)
      expect(result).toEqual(user)
    })

    it('should return null when user not found', async () => {
      // Arrange
      mockRepository.findByUsername.mockResolvedValue(null)

      // Act
      const result = await service.findByUsername('nonexistent')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByCI', () => {
    it('should find user by CI', async () => {
      // Arrange
      const user = TEST_USERS.USUARIO
      mockRepository.findByCI.mockResolvedValue(user)

      // Act
      const result = await service.findByCI(user.ci)

      // Assert
      expect(mockRepository.findByCI).toHaveBeenCalledWith(user.ci)
      expect(result).toEqual(user)
    })

    it('should return null when user not found', async () => {
      // Arrange
      mockRepository.findByCI.mockResolvedValue(null)

      // Act
      const result = await service.findByCI('99999999')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByOrganization', () => {
    it('should find all users from same organization', async () => {
      // Arrange
      const org1User1 = createTestUser({
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        ci: '11111111',
        organizationId: 'org-1',
      })

      const org1User2 = createTestUser({
        id: 'user-2',
        email: 'user2@test.com',
        username: 'user2',
        ci: '22222222',
        organizationId: 'org-1',
      })

      mockRepository.findByOrganization.mockResolvedValue([
        org1User1,
        org1User2,
      ])

      // Act
      const result = await service.findByOrganization('org-1')

      // Assert
      expect(mockRepository.findByOrganization).toHaveBeenCalledWith('org-1')
      expect(result).toHaveLength(2)
      expect(result).toEqual([org1User1, org1User2])
    })

    it('should return empty array when no users in organization', async () => {
      // Arrange
      mockRepository.findByOrganization.mockResolvedValue([])

      // Act
      const result = await service.findByOrganization('org-empty')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    it('should update user correctly', async () => {
      // Arrange
      const userId = 'user-1'
      const updateDto: UpdateUserDto = {
        names: 'Updated Admin',
        email: 'updated-admin@test.com', // New unique email
      }

      const existingUser = createTestUser({
        id: userId,
        names: 'Original Admin',
        email: 'admin@test.com',
      })

      const updatedUser = {
        ...existingUser,
        names: 'Updated Admin',
        email: 'updated-admin@test.com',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueEmail.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue(updatedUser)

      // Act
      const result = await service.update(userId, updateDto)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(userId)
      expect(mockValidator.validateUniqueEmail).toHaveBeenCalledWith(
        updateDto.email,
        userId,
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          names: 'Updated Admin',
          email: 'updated-admin@test.com',
        }),
      )
      expect(result).toEqual(updatedUser)
    })

    it('should allow updating to same email (no validation)', async () => {
      // Arrange
      const userId = 'user-1'
      const existingUser = createTestUser({
        id: userId,
        email: 'admin@test.com',
      })

      const updateDto: UpdateUserDto = {
        email: existingUser.email, // Same email
        names: 'Updated Names',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockRepository.save.mockResolvedValue({
        ...existingUser,
        names: 'Updated Names',
      })

      // Act
      await service.update(userId, updateDto)

      // Assert - NO se valida el email (es el mismo)
      expect(mockValidator.validateUniqueEmail).not.toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should validate email when changed', async () => {
      // Arrange
      const userId = 'user-1'
      const existingUser = createTestUser({
        id: userId,
        email: 'original@test.com',
      })

      const updateDto: UpdateUserDto = {
        email: 'new@test.com', // ✅ Email diferente
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueEmail.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...existingUser,
        email: 'new@test.com',
      })

      // Act
      await service.update(userId, updateDto)

      // Assert - SÍ se valida porque cambió
      expect(mockValidator.validateUniqueEmail).toHaveBeenCalledWith(
        updateDto.email,
        userId,
      )
    })

    it('should validate username when changed', async () => {
      // Arrange
      const userId = 'user-1'
      const existingUser = createTestUser({
        id: userId,
        username: 'oldusername',
      })

      const updateDto: UpdateUserDto = {
        username: 'newusername', // ✅ Username diferente
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueUsername.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...existingUser,
        username: 'newusername',
      })

      // Act
      await service.update(userId, updateDto)

      // Assert - SÍ se valida porque cambió
      expect(mockValidator.validateUniqueUsername).toHaveBeenCalledWith(
        updateDto.username,
        userId,
      )
    })

    it('should validate CI when changed', async () => {
      // Arrange
      const userId = 'user-1'
      const existingUser = createTestUser({
        id: userId,
        ci: '11111111',
      })

      const updateDto: UpdateUserDto = {
        ci: '22222222', // ✅ CI diferente
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueCI.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...existingUser,
        ci: '22222222',
      })

      // Act
      await service.update(userId, updateDto)

      // Assert - SÍ se valida porque cambió
      expect(mockValidator.validateUniqueCI).toHaveBeenCalledWith(
        updateDto.ci,
        userId,
      )
    })

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      const userId = 'nonexistent'
      const updateDto: UpdateUserDto = { names: 'Updated' }

      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.update(userId, updateDto)).rejects.toThrow(
        UserNotFoundException,
      )

      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('uploadProfileImage', () => {
    it('should upload profile image and update user', async () => {
      // Arrange
      const user = createTestUser({
        id: 'user-test',
        image: null, // Sin imagen previa
      })

      const mockFile = {
        filename: 'profile.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File

      const uploadResult = {
        filePath: 'users/profiles/user-test.jpg',
        fileName: 'user-test.jpg',
        fileSize: 1024,
        url: 'http://localhost/users/profiles/user-test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      }

      mockRepository.findById.mockResolvedValue(user)
      mockFilesService.replaceFile.mockResolvedValue(uploadResult as any)
      mockRepository.save.mockResolvedValue({
        ...user,
        image: uploadResult.filePath,
      })

      // Act
      const result = await service.uploadProfileImage(user.id, mockFile)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(user.id)
      expect(mockFilesService.replaceFile).toHaveBeenCalledWith(
        null, // user.image es null
        expect.objectContaining({
          file: mockFile,
          folder: 'users/profiles',
          customFileName: `user-${user.id}`,
        }),
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          image: uploadResult.filePath,
        }),
      )
      expect(result.image).toBe(uploadResult.filePath)
    })
  })

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      // Arrange
      const user = TEST_USERS.ADMIN

      mockRepository.findById.mockResolvedValue(user)
      mockRepository.save.mockResolvedValue({
        ...user,
        status: UserStatus.INACTIVE,
      })

      // Act
      const result = await service.deactivate(user.id)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(user.id)
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.INACTIVE,
        }),
      )
      expect(result.status).toBe(UserStatus.INACTIVE)
    })

    it('should throw when user not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      )
    })
  })

  describe('remove (soft delete)', () => {
    it('should soft delete user', async () => {
      // Arrange
      const user = TEST_USERS.ADMIN

      mockRepository.findById.mockResolvedValue(user)
      mockRepository.softDelete.mockResolvedValue(true)

      // Act
      await service.remove(user.id)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(user.id)
      expect(mockRepository.softDelete).toHaveBeenCalledWith(user.id)
    })

    it('should throw when user not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      )

      expect(mockRepository.softDelete).not.toHaveBeenCalled()
    })
  })

  describe('Complex scenarios', () => {
    it('should hash password when creating user with real factory', async () => {
      // Arrange
      const plainPassword = 'MySecurePass123!'
      const dto: CreateUserDto = {
        names: 'Test',
        lastNames: 'User',
        email: 'test@test.com',
        username: 'testuser',
        ci: '12345678',
        password: plainPassword,
        organizationId: 'org-test', // ✅ Requerido
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)

      // Capturamos qué recibe el repository.save
      let savedData: any
      mockRepository.save.mockImplementation(async (data: any) => {
        savedData = data
        return { ...data, id: 'user-123' }
      })

      // Act
      await service.create(dto)

      // Assert - ✅ Factory hasheó la contraseña
      expect(savedData.password).toBeDefined()
      expect(savedData.password).not.toBe(plainPassword) // NO es plain text
      expect(savedData.password.length).toBeGreaterThan(50) // Hash largo

      // ✅ Verificamos que sea un hash válido de bcrypt
      expect(savedData.password).toMatch(/^\$2[aby]\$/) // Bcrypt format
    })
  })
})
