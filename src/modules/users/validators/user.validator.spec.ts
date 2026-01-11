import { Test, TestingModule } from '@nestjs/testing'
import { UserValidator } from './user.validator'
import {
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  CiAlreadyExistsException,
  UserNotFoundException,
} from '../exceptions'
import type { IUsersRepository } from '../repositories'
import { USERS_REPOSITORY } from '../tokens'
import type { IOrganizationRepository } from '../../organizations'
import { ORGANIZATION_REPOSITORY } from '../../organizations'
import { createMock } from '@core/testing'

/**
 * ✅ UNIT TESTS - UserValidator (con PersistenceModule)
 *
 * Testing approach:
 * - Mock USERS_REPOSITORY y ORGANIZATION_REPOSITORY
 * - Enfoque: Probar lógica de validación y que se lancen las excepciones correctas
 */
describe('UserValidator', () => {
  let validator: UserValidator
  let mockRepository: jest.Mocked<IUsersRepository>
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>

  beforeEach(async () => {
    mockRepository = createMock<IUsersRepository>({
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      existsByCI: jest.fn(),
      findById: jest.fn(),
    })

    mockOrganizationRepository = createMock<IOrganizationRepository>({
      existsActiveById: jest.fn(),
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidator,
        {
          provide: USERS_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile()

    validator = module.get<UserValidator>(UserValidator)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUniqueEmail', () => {
    it('should pass when email is unique', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(false)

      // Act & Assert - No lanza error
      await expect(
        validator.validateUniqueEmail('unique@test.com'),
      ).resolves.not.toThrow()

      expect(mockRepository.existsByEmail).toHaveBeenCalledWith(
        'unique@test.com',
        undefined,
      )
    })

    it('should throw EmailAlreadyExistsException when email exists', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(true)

      // Act & Assert
      await expect(
        validator.validateUniqueEmail('duplicate@test.com'),
      ).rejects.toThrow(EmailAlreadyExistsException)

      expect(mockRepository.existsByEmail).toHaveBeenCalledWith(
        'duplicate@test.com',
        undefined,
      )
    })

    it('should exclude specific ID when validating (for updates)', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(false)

      // Act
      await validator.validateUniqueEmail('email@test.com', 'user-123')

      // Assert
      expect(mockRepository.existsByEmail).toHaveBeenCalledWith(
        'email@test.com',
        'user-123', // ✅ Excluye este ID
      )
    })
  })

  describe('validateUniqueUsername', () => {
    it('should pass when username is unique', async () => {
      // Arrange
      mockRepository.existsByUsername.mockResolvedValue(false)

      // Act & Assert
      await expect(
        validator.validateUniqueUsername('uniqueuser'),
      ).resolves.not.toThrow()

      expect(mockRepository.existsByUsername).toHaveBeenCalledWith(
        'uniqueuser',
        undefined,
      )
    })

    it('should throw UsernameAlreadyExistsException when username exists', async () => {
      // Arrange
      mockRepository.existsByUsername.mockResolvedValue(true)

      // Act & Assert
      await expect(
        validator.validateUniqueUsername('duplicateuser'),
      ).rejects.toThrow(UsernameAlreadyExistsException)

      expect(mockRepository.existsByUsername).toHaveBeenCalledWith(
        'duplicateuser',
        undefined,
      )
    })

    it('should exclude specific ID when validating (for updates)', async () => {
      // Arrange
      mockRepository.existsByUsername.mockResolvedValue(false)

      // Act
      await validator.validateUniqueUsername('username', 'user-123')

      // Assert
      expect(mockRepository.existsByUsername).toHaveBeenCalledWith(
        'username',
        'user-123',
      )
    })
  })

  describe('validateUniqueCI', () => {
    it('should pass when CI is unique', async () => {
      // Arrange
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act & Assert
      await expect(
        validator.validateUniqueCI('12345678'),
      ).resolves.not.toThrow()

      expect(mockRepository.existsByCI).toHaveBeenCalledWith(
        '12345678',
        undefined,
      )
    })

    it('should throw CiAlreadyExistsException when CI exists', async () => {
      // Arrange
      mockRepository.existsByCI.mockResolvedValue(true)

      // Act & Assert
      await expect(validator.validateUniqueCI('12345678')).rejects.toThrow(
        CiAlreadyExistsException,
      )

      expect(mockRepository.existsByCI).toHaveBeenCalledWith(
        '12345678',
        undefined,
      )
    })

    it('should exclude specific ID when validating (for updates)', async () => {
      // Arrange
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act
      await validator.validateUniqueCI('12345678', 'user-123')

      // Assert
      expect(mockRepository.existsByCI).toHaveBeenCalledWith(
        '12345678',
        'user-123',
      )
    })
  })

  describe('validateUniqueConstraints', () => {
    it('should validate all constraints in parallel when all are unique', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(false)
      mockRepository.existsByUsername.mockResolvedValue(false)
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act
      await validator.validateUniqueConstraints(
        'email@test.com',
        'username',
        '12345678',
      )

      // Assert - Todas las validaciones se llamaron
      expect(mockRepository.existsByEmail).toHaveBeenCalledWith(
        'email@test.com',
        undefined,
      )
      expect(mockRepository.existsByUsername).toHaveBeenCalledWith(
        'username',
        undefined,
      )
      expect(mockRepository.existsByCI).toHaveBeenCalledWith(
        '12345678',
        undefined,
      )
    })

    it('should throw EmailAlreadyExistsException when email is duplicate', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(true) // ❌ Email existe
      mockRepository.existsByUsername.mockResolvedValue(false)
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints(
          'duplicate@test.com',
          'username',
          '12345678',
        ),
      ).rejects.toThrow(EmailAlreadyExistsException)
    })

    it('should throw UsernameAlreadyExistsException when username is duplicate', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(false)
      mockRepository.existsByUsername.mockResolvedValue(true) // ❌ Username existe
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints(
          'email@test.com',
          'duplicateuser',
          '12345678',
        ),
      ).rejects.toThrow(UsernameAlreadyExistsException)
    })

    it('should throw CiAlreadyExistsException when CI is duplicate', async () => {
      // Arrange
      mockRepository.existsByEmail.mockResolvedValue(false)
      mockRepository.existsByUsername.mockResolvedValue(false)
      mockRepository.existsByCI.mockResolvedValue(true) // ❌ CI existe

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints(
          'email@test.com',
          'username',
          '12345678',
        ),
      ).rejects.toThrow(CiAlreadyExistsException)
    })

    it('should validate with excludeId for updates', async () => {
      // Arrange
      const excludeId = 'user-123'
      mockRepository.existsByEmail.mockResolvedValue(false)
      mockRepository.existsByUsername.mockResolvedValue(false)
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act
      await validator.validateUniqueConstraints(
        'email@test.com',
        'username',
        '12345678',
        excludeId,
      )

      // Assert - Todas las validaciones incluyen el excludeId
      expect(mockRepository.existsByEmail).toHaveBeenCalledWith(
        'email@test.com',
        excludeId,
      )
      expect(mockRepository.existsByUsername).toHaveBeenCalledWith(
        'username',
        excludeId,
      )
      expect(mockRepository.existsByCI).toHaveBeenCalledWith(
        '12345678',
        excludeId,
      )
    })

    it('should fail fast on first duplicate (Promise.all behavior)', async () => {
      // Arrange - Email es duplicado
      mockRepository.existsByEmail.mockResolvedValue(true)
      mockRepository.existsByUsername.mockResolvedValue(false)
      mockRepository.existsByCI.mockResolvedValue(false)

      // Act & Assert - Falla en email (primera validación)
      await expect(
        validator.validateUniqueConstraints(
          'duplicate@test.com',
          'username',
          '12345678',
        ),
      ).rejects.toThrow(EmailAlreadyExistsException)

      // Nota: Promise.all ejecuta todas en paralelo pero falla en la primera que rechace
    })
  })

  describe('ensureUserExists', () => {
    it('should pass when user exists', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
      } as any)

      // Act & Assert
      await expect(
        validator.ensureUserExists('user-123'),
      ).resolves.not.toThrow()

      expect(mockRepository.findById).toHaveBeenCalledWith('user-123')
    })

    it('should throw UserNotFoundException when user does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.ensureUserExists('nonexistent-id'),
      ).rejects.toThrow(UserNotFoundException)

      expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent-id')
    })
  })
})
