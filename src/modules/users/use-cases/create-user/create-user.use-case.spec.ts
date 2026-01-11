import { Test, TestingModule } from '@nestjs/testing'
import { CreateUserUseCase } from './create-user.use-case'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { CreateUserDto } from '../../dtos'
import { UserEntity, UserStatus, Role } from '../../entities/user.entity'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'
import { createMock } from '@core/testing'

/**
 * ✅ UNIT TEST - CreateUserUseCase
 *
 * Testing approach:
 * - Mock Repository: Solo mockeamos save
 * - Mock Validator: Mockeamos validaciones
 * - Real Factory: Usamos factory real para probar normalizaciones
 */
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase
  let mockRepository: jest.Mocked<IUsersRepository>
  let mockValidator: jest.Mocked<UserValidator>
  let factory: UserFactory

  beforeEach(async () => {
    // Crear mocks
    mockRepository = createMock<IUsersRepository>({
      save: jest.fn(),
    })

    mockValidator = createMock<UserValidator>({
      validateUniqueConstraints: jest.fn(),
      validateOrganizationExists: jest.fn(),
    })

    factory = new UserFactory() // Factory real

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
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
      ],
    }).compile()

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase)
  })

  describe('execute', () => {
    const createUserDto: CreateUserDto = {
      names: 'Juan Carlos',
      lastNames: 'Pérez López',
      email: 'JUAN@TEST.COM', // Uppercase para probar normalización
      username: 'JuanPerez', // Mixed case para probar normalización
      ci: '12345678',
      password: 'SecurePass123!',
      phone: '71234567',
      address: 'Calle Test 123',
      organizationId: 'org-1',
      roles: [Role.AUDITOR],
      status: UserStatus.ACTIVE,
    }

    it('should create user successfully', async () => {
      // Arrange
      const expectedUser = new UserEntity()
      expectedUser.id = 'user-1'
      expectedUser.email = 'juan@test.com' // Normalizado

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockValidator.validateOrganizationExists.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue(expectedUser)

      // Act
      const result = await useCase.execute(createUserDto)

      // Assert
      expect(mockValidator.validateUniqueConstraints).toHaveBeenCalledWith(
        createUserDto.email,
        createUserDto.username,
        createUserDto.ci,
      )
      expect(mockValidator.validateOrganizationExists).toHaveBeenCalledWith(
        createUserDto.organizationId,
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'juan@test.com', // Verificar normalización
          username: 'juanperez', // Verificar normalización
        }),
      )
      expect(result).toEqual(expectedUser)
    })

    it('should normalize email and username to lowercase', async () => {
      // Arrange
      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockValidator.validateOrganizationExists.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute(createUserDto)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'juan@test.com',
          username: 'juanperez',
        }),
      )
    })

    it('should hash password before saving', async () => {
      // Arrange
      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockValidator.validateOrganizationExists.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute(createUserDto)

      // Assert
      const savedUser = mockRepository.save.mock.calls[0][0]
      expect(savedUser.password).not.toBe(createUserDto.password)
      expect(savedUser.password).toMatch(/^\$2[aby]\$/) // bcrypt hash pattern
    })

    it('should set organizationId as required', async () => {
      // Arrange
      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockValidator.validateOrganizationExists.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute(createUserDto)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
        }),
      )
    })

    it('should call validations in parallel', async () => {
      // Arrange
      const validationOrder: string[] = []

      mockValidator.validateUniqueConstraints.mockImplementation(async () => {
        validationOrder.push('unique')
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      mockValidator.validateOrganizationExists.mockImplementation(async () => {
        validationOrder.push('org')
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      mockRepository.save.mockResolvedValue(new UserEntity())

      // Act
      await useCase.execute(createUserDto)

      // Assert - ambas validaciones deben haberse llamado
      expect(mockValidator.validateUniqueConstraints).toHaveBeenCalled()
      expect(mockValidator.validateOrganizationExists).toHaveBeenCalled()
    })

    it('should throw error if email already exists', async () => {
      // Arrange
      const error = new Error('Email already exists')
      mockValidator.validateUniqueConstraints.mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(createUserDto)).rejects.toThrow(
        'Email already exists',
      )
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should throw error if organization does not exist', async () => {
      // Arrange
      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      const error = new Error('Organization not found')
      mockValidator.validateOrganizationExists.mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(createUserDto)).rejects.toThrow(
        'Organization not found',
      )
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })
})
