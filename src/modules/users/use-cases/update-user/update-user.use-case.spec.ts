import { Test, TestingModule } from '@nestjs/testing'
import { UpdateUserUseCase } from './update-user.use-case'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { UpdateUserDto } from '../../dtos'
import { UserEntity, UserStatus, Role } from '../../entities/user.entity'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'
import { createMock } from '@core/testing'

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase
  let mockRepository: jest.Mocked<IUsersRepository>
  let mockValidator: jest.Mocked<UserValidator>
  let factory: UserFactory

  const existingUser: UserEntity = {
    id: 'user-1',
    names: 'Juan',
    lastNames: 'Pérez',
    email: 'juan@test.com',
    username: 'juanperez',
    ci: '12345678',
    password: 'hashed',
    phone: '71234567',
    address: 'Address',
    organizationId: 'org-1',
    roles: [Role.AUDITOR],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    fullName: 'Juan Pérez',
  } as UserEntity

  beforeEach(async () => {
    mockRepository = createMock<IUsersRepository>({
      findById: jest.fn(),
      save: jest.fn(),
    })

    mockValidator = createMock<UserValidator>({
      validateUniqueEmail: jest.fn(),
      validateUniqueUsername: jest.fn(),
      validateUniqueCI: jest.fn(),
      validateOrganizationExists: jest.fn(),
    })

    factory = new UserFactory()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
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

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase)
  })

  describe('execute', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        names: 'Carlos',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      const result = await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith('user-1')
      expect(result.names).toBe('Carlos')
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should throw UserNotFoundException if user does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(
        useCase.execute('non-existent', { names: 'Test' }),
      ).rejects.toThrow(UserNotFoundException)
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should validate email only if it changed', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'newemail@test.com',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueEmail.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockValidator.validateUniqueEmail).toHaveBeenCalledWith(
        'newemail@test.com',
        'user-1',
      )
    })

    it('should NOT validate email if it did not change', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'juan@test.com', // Same as existing
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockValidator.validateUniqueEmail).not.toHaveBeenCalled()
    })

    it('should validate organization only if it changed', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        organizationId: 'org-2',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateOrganizationExists.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockValidator.validateOrganizationExists).toHaveBeenCalledWith(
        'org-2',
      )
    })

    it('should validate multiple fields in parallel if they changed', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'new@test.com',
        username: 'newusername',
        ci: '87654321',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueEmail.mockResolvedValue(undefined)
      mockValidator.validateUniqueUsername.mockResolvedValue(undefined)
      mockValidator.validateUniqueCI.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockValidator.validateUniqueEmail).toHaveBeenCalled()
      expect(mockValidator.validateUniqueUsername).toHaveBeenCalled()
      expect(mockValidator.validateUniqueCI).toHaveBeenCalled()
    })

    it('should normalize email to lowercase when updating', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        email: 'NEWEMAIL@TEST.COM',
      }

      mockRepository.findById.mockResolvedValue(existingUser)
      mockValidator.validateUniqueEmail.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      )

      // Act
      await useCase.execute('user-1', updateDto)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newemail@test.com',
        }),
      )
    })
  })
})
