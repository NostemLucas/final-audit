import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import type { IUsersRepository } from '../repositories'
import { USERS_REPOSITORY } from '../repositories'
import { UserValidator } from '../validators/user.validator'
import { UserFactory } from '../factories/user.factory'
import { UserEntity, UserStatus, Role } from '../entities/user.entity'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserNotFoundException } from '../exceptions'
import { FilesService } from '@core/files'
import { TransactionService } from '@core/database'

describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<IUsersRepository>
  let validator: jest.Mocked<UserValidator>
  let factory: jest.Mocked<UserFactory>
  let filesService: jest.Mocked<FilesService>
  let transactionService: jest.Mocked<TransactionService>

  const mockUser: UserEntity = {
    id: '1',
    names: 'Juan Carlos',
    lastNames: 'Pérez López',
    email: 'juan@test.com',
    username: 'juanperez',
    ci: '12345678',
    password: 'hashed_password',
    phone: '71234567',
    address: 'Calle Test 123',
    organizationId: 'org-1',
    roles: [Role.AUDITOR],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  } as UserEntity

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IUsersRepository>> = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByCI: jest.fn(),
      findByOrganization: jest.fn(),
      softDelete: jest.fn(),
    }

    const mockValidator: Partial<jest.Mocked<UserValidator>> = {
      validateUniqueConstraints: jest.fn(),
      validateUniqueEmail: jest.fn(),
      validateUniqueUsername: jest.fn(),
      validateUniqueCI: jest.fn(),
    }

    const mockFactory: Partial<jest.Mocked<UserFactory>> = {
      createFromDto: jest.fn(),
      updateFromDto: jest.fn(),
      verifyPassword: jest.fn(),
    }

    const mockFilesService: Partial<jest.Mocked<FilesService>> = {
      uploadFile: jest.fn(),
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      getFileUrl: jest.fn(),
    }

    const mockTransactionService: Partial<jest.Mocked<TransactionService>> = {
      runInTransaction: jest.fn((callback) => callback()),
    }

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
          useValue: mockFactory,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    repository = module.get(USERS_REPOSITORY)
    validator = module.get(UserValidator)
    factory = module.get(UserFactory)
    filesService = module.get(FilesService)
    transactionService = module.get(TransactionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    const createDto: CreateUserDto = {
      names: 'Pedro',
      lastNames: 'García',
      email: 'pedro@test.com',
      username: 'pedrogarcia',
      ci: '87654321',
      password: 'Password123!',
      phone: '79876543',
      address: 'Av. Test 456',
      organizationId: 'org-2',
      roles: [Role.USUARIO],
      status: UserStatus.ACTIVE,
    }

    it('should create a user successfully', async () => {
      // Arrange
      const createdUser = {
        ...mockUser,
        ...createDto,
        password: 'hashed_password',
      }
      validator.validateUniqueConstraints.mockResolvedValue(undefined)
      factory.createFromDto.mockReturnValue(createdUser)
      repository.save.mockResolvedValue(createdUser)

      // Act
      const result = await service.create(createDto)

      // Assert
      expect(validator.validateUniqueConstraints).toHaveBeenCalledWith(
        createDto.email,
        createDto.username,
        createDto.ci,
      )
      expect(factory.createFromDto).toHaveBeenCalledWith(createDto)
      expect(repository.save).toHaveBeenCalledWith(createdUser)
      expect(result).toBe(createdUser)
    })

    it('should throw ConflictException when validation fails', async () => {
      // Arrange
      const error = new Error(
        'Ya existe un usuario con el email "pedro@test.com"',
      )
      validator.validateUniqueConstraints.mockRejectedValue(error)

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(error)
      expect(factory.createFromDto).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const users = [mockUser]
      repository.findAll.mockResolvedValue(users)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAll).toHaveBeenCalled()
      expect(result).toBe(users)
    })

    it('should return empty array when no users exist', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return user by id', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockUser)

      // Act
      const result = await service.findOne('1')

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1')
      expect(result).toBe(mockUser)
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne('999')).rejects.toThrow(
        new UserNotFoundException('999'),
      )
    })
  })

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      repository.findByEmail.mockResolvedValue(mockUser)

      // Act
      const result = await service.findByEmail('juan@test.com')

      // Assert
      expect(repository.findByEmail).toHaveBeenCalledWith('juan@test.com')
      expect(result).toBe(mockUser)
    })

    it('should return null when user not found by email', async () => {
      // Arrange
      repository.findByEmail.mockResolvedValue(null)

      // Act
      const result = await service.findByEmail('notfound@test.com')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      // Arrange
      repository.findByUsername.mockResolvedValue(mockUser)

      // Act
      const result = await service.findByUsername('juanperez')

      // Assert
      expect(repository.findByUsername).toHaveBeenCalledWith('juanperez')
      expect(result).toBe(mockUser)
    })

    it('should return null when user not found by username', async () => {
      // Arrange
      repository.findByUsername.mockResolvedValue(null)

      // Act
      const result = await service.findByUsername('notfound')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByCI', () => {
    it('should return user by CI', async () => {
      // Arrange
      repository.findByCI.mockResolvedValue(mockUser)

      // Act
      const result = await service.findByCI('12345678')

      // Assert
      expect(repository.findByCI).toHaveBeenCalledWith('12345678')
      expect(result).toBe(mockUser)
    })

    it('should return null when user not found by CI', async () => {
      // Arrange
      repository.findByCI.mockResolvedValue(null)

      // Act
      const result = await service.findByCI('99999999')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByOrganization', () => {
    it('should return users by organization', async () => {
      // Arrange
      const users = [mockUser]
      repository.findByOrganization.mockResolvedValue(users)

      // Act
      const result = await service.findByOrganization('org-1')

      // Assert
      expect(repository.findByOrganization).toHaveBeenCalledWith('org-1')
      expect(result).toBe(users)
    })

    it('should return empty array when organization has no users', async () => {
      // Arrange
      repository.findByOrganization.mockResolvedValue([])

      // Act
      const result = await service.findByOrganization('org-empty')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      names: 'Juan Carlos Updated',
      phone: '77777777',
    }

    it('should update user successfully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...updateDto }
      repository.findById.mockResolvedValue(mockUser)
      factory.updateFromDto.mockReturnValue(updatedUser)
      repository.save.mockResolvedValue(updatedUser)

      // Act
      const result = await service.update('1', updateDto)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1')
      expect(factory.updateFromDto).toHaveBeenCalledWith(mockUser, updateDto)
      expect(repository.save).toHaveBeenCalledWith(updatedUser)
      expect(result).toEqual(updatedUser)
    })

    it('should validate email when updating', async () => {
      // Arrange
      const updateWithEmail: UpdateUserDto = { email: 'newemail@test.com' }
      const updatedUser = { ...mockUser, ...updateWithEmail }
      repository.findById.mockResolvedValue(mockUser)
      validator.validateUniqueEmail.mockResolvedValue(undefined)
      factory.updateFromDto.mockReturnValue(updatedUser)
      repository.save.mockResolvedValue(updatedUser)

      // Act
      await service.update('1', updateWithEmail)

      // Assert
      expect(validator.validateUniqueEmail).toHaveBeenCalledWith(
        updateWithEmail.email,
        '1',
      )
      expect(factory.updateFromDto).toHaveBeenCalledWith(
        mockUser,
        updateWithEmail,
      )
    })

    it('should validate username when updating', async () => {
      // Arrange
      const updateWithUsername: UpdateUserDto = { username: 'newusername' }
      const updatedUser = { ...mockUser, ...updateWithUsername }
      repository.findById.mockResolvedValue(mockUser)
      validator.validateUniqueUsername.mockResolvedValue(undefined)
      factory.updateFromDto.mockReturnValue(updatedUser)
      repository.save.mockResolvedValue(updatedUser)

      // Act
      await service.update('1', updateWithUsername)

      // Assert
      expect(validator.validateUniqueUsername).toHaveBeenCalledWith(
        updateWithUsername.username,
        '1',
      )
    })

    it('should validate CI when updating', async () => {
      // Arrange
      const updateWithCI: UpdateUserDto = { ci: '99999999' }
      const updatedUser = { ...mockUser, ...updateWithCI }
      repository.findById.mockResolvedValue(mockUser)
      validator.validateUniqueCI.mockResolvedValue(undefined)
      factory.updateFromDto.mockReturnValue(updatedUser)
      repository.save.mockResolvedValue(updatedUser)

      // Act
      await service.update('1', updateWithCI)

      // Assert
      expect(validator.validateUniqueCI).toHaveBeenCalledWith(
        updateWithCI.ci,
        '1',
      )
    })

    it('should not validate fields if they have not changed', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { phone: '77777777' }
      const updatedUser = { ...mockUser, phone: '77777777' }
      repository.findById.mockResolvedValue(mockUser)
      factory.updateFromDto.mockReturnValue(updatedUser)
      repository.save.mockResolvedValue(updatedUser)

      // Act
      await service.update('1', updateDto)

      // Assert
      expect(validator.validateUniqueEmail).not.toHaveBeenCalled()
      expect(validator.validateUniqueUsername).not.toHaveBeenCalled()
      expect(validator.validateUniqueCI).not.toHaveBeenCalled()
      expect(factory.updateFromDto).toHaveBeenCalledWith(mockUser, updateDto)
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('999', updateDto)).rejects.toThrow(
        UserNotFoundException,
      )
      expect(factory.updateFromDto).not.toHaveBeenCalled()
    })
  })

  describe('uploadProfileImage', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
    } as Express.Multer.File

    it('should upload profile image successfully', async () => {
      // Arrange
      const uploadResult = {
        fileName: 'user-1.png',
        filePath: 'users/profiles/user-1.png',
        url: 'http://localhost:3000/uploads/users/profiles/user-1.png',
        size: 1024,
        mimeType: 'image/png',
      }
      const userWithImage = {
        ...mockUser,
        image: uploadResult.filePath,
      }

      repository.findById.mockResolvedValue(mockUser)
      filesService.replaceFile.mockResolvedValue(uploadResult)
      repository.save.mockResolvedValue(userWithImage)

      // Act
      const result = await service.uploadProfileImage('1', mockFile)

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1')
      expect(filesService.replaceFile).toHaveBeenCalledWith(
        null, // mockUser.image es null (sin imagen previa)
        expect.objectContaining({
          file: mockFile,
          folder: 'users/profiles',
          customFileName: 'user-1',
          overwrite: true,
          validationOptions: expect.objectContaining({
            fileType: 'image',
            maxSize: 2 * 1024 * 1024,
            maxWidth: 512,
            maxHeight: 512,
          }),
        }),
      )
      expect(repository.save).toHaveBeenCalled()
      expect(result.image).toBe(uploadResult.filePath)
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.uploadProfileImage('999', mockFile)).rejects.toThrow(
        UserNotFoundException,
      )
      expect(filesService.replaceFile).not.toHaveBeenCalled()
    })
  })

  describe('deactivate', () => {
    it('should deactivate user successfully', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE }
      repository.findById.mockResolvedValue(mockUser)
      repository.save.mockResolvedValue(inactiveUser)

      // Act
      const result = await service.deactivate('1')

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1')
      expect(repository.save).toHaveBeenCalled()
      expect(result.status).toBe(UserStatus.INACTIVE)
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.deactivate('999')).rejects.toThrow(
        UserNotFoundException,
      )
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockUser)
      repository.softDelete.mockResolvedValue(undefined)

      // Act
      await service.remove('1')

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('1')
      expect(repository.softDelete).toHaveBeenCalledWith('1')
    })

    it('should throw UserNotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('999')).rejects.toThrow(UserNotFoundException)
      expect(repository.softDelete).not.toHaveBeenCalled()
    })
  })
})
