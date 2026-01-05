import { Test, TestingModule } from '@nestjs/testing'
import { OrganizationsService } from './organizations.service'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../repositories'
import { OrganizationValidator } from '../validators/organization.validator'
import { OrganizationEntity } from '../entities/organization.entity'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'
import {
  OrganizationNotFoundException,
  OrganizationHasActiveUsersException,
} from '../exceptions'
import { FilesService } from '@core/files'

describe('OrganizationsService', () => {
  let service: OrganizationsService
  let repository: jest.Mocked<IOrganizationRepository>
  let validator: jest.Mocked<OrganizationValidator>
  let filesService: jest.Mocked<FilesService>

  const mockOrganization: OrganizationEntity = {
    id: '1',
    name: 'Test Organization',
    nit: '123456789',
    description: 'Test description',
    address: 'Test address',
    phone: '1234567',
    email: 'test@test.com',
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  } as OrganizationEntity

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IOrganizationRepository>> = {
      create: jest.fn(),
      save: jest.fn(),
      findAllActive: jest.fn(),
      findActiveById: jest.fn(),
      findActiveByNit: jest.fn(),
      findByNit: jest.fn(),
      findByName: jest.fn(),
      countActiveUsers: jest.fn(),
      hardDelete: jest.fn(),
    }

    const mockValidator: Partial<jest.Mocked<OrganizationValidator>> = {
      validateUniqueConstraints: jest.fn(),
      validateUniqueName: jest.fn(),
      validateUniqueNit: jest.fn(),
    }

    const mockFilesService: Partial<jest.Mocked<FilesService>> = {
      uploadFile: jest.fn(),
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      getFileUrl: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: OrganizationValidator,
          useValue: mockValidator,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile()

    service = module.get<OrganizationsService>(OrganizationsService)
    repository = module.get(ORGANIZATION_REPOSITORY)
    validator = module.get(OrganizationValidator)
    filesService = module.get(FilesService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      name: 'New Organization',
      nit: '987654321',
      description: 'New description',
      address: 'New address',
      phone: '7654321',
      email: 'new@test.com',
    }

    it('should create an organization successfully', async () => {
      // Arrange
      const createdOrg = { ...mockOrganization, ...createDto }
      validator.validateUniqueConstraints.mockResolvedValue(undefined)
      repository.create.mockReturnValue(createdOrg)
      repository.save.mockResolvedValue(createdOrg)

      // Act
      const result = await service.create(createDto)

      // Assert
      expect(validator.validateUniqueConstraints).toHaveBeenCalledWith(
        createDto.name,
        createDto.nit,
      )
      expect(repository.create).toHaveBeenCalledWith(createDto)
      expect(repository.save).toHaveBeenCalledWith(createdOrg)
      expect(result).toBe(createdOrg)
    })

    it('should throw ConflictException when validation fails', async () => {
      // Arrange
      const error = new Error('Ya existe una organización con el nombre "New Organization"')
      validator.validateUniqueConstraints.mockRejectedValue(error)

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(error)
      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all active organizations', async () => {
      // Arrange
      const organizations = [mockOrganization]
      repository.findAllActive.mockResolvedValue(organizations)

      // Act
      const result = await service.findAll()

      // Assert
      expect(repository.findAllActive).toHaveBeenCalled()
      expect(result).toBe(organizations)
    })

    it('should return empty array when no organizations exist', async () => {
      // Arrange
      repository.findAllActive.mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return organization by id', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(mockOrganization)

      // Act
      const result = await service.findOne('1')

      // Assert
      expect(repository.findActiveById).toHaveBeenCalledWith('1')
      expect(result).toBe(mockOrganization)
    })

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne('999')).rejects.toThrow(
        new OrganizationNotFoundException('999'),
      )
    })
  })

  describe('findByNit', () => {
    it('should return organization by NIT', async () => {
      // Arrange
      repository.findActiveByNit.mockResolvedValue(mockOrganization)

      // Act
      const result = await service.findByNit('123456789')

      // Assert
      expect(repository.findActiveByNit).toHaveBeenCalledWith('123456789')
      expect(result).toBe(mockOrganization)
    })

    it('should throw OrganizationNotFoundException when organization not found by NIT', async () => {
      // Arrange
      repository.findActiveByNit.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findByNit('999999999')).rejects.toThrow(
        new OrganizationNotFoundException('999999999', 'NIT'),
      )
    })
  })

  describe('update', () => {
    const updateDto: UpdateOrganizationDto = {
      name: 'Updated Name',
      description: 'Updated description',
    }

    it('should update organization successfully', async () => {
      // Arrange
      const updatedOrg = { ...mockOrganization, ...updateDto }
      repository.findActiveById.mockResolvedValue(mockOrganization)
      validator.validateUniqueName.mockResolvedValue(undefined)
      repository.save.mockResolvedValue(updatedOrg)

      // Act
      const result = await service.update('1', updateDto)

      // Assert
      expect(validator.validateUniqueName).toHaveBeenCalledWith(updateDto.name, '1')
      expect(repository.save).toHaveBeenCalled()
      expect(result).toEqual(updatedOrg)
    })

    it('should validate NIT when updating', async () => {
      // Arrange
      const updateWithNit: UpdateOrganizationDto = { nit: '999999999' }
      const updatedOrg = { ...mockOrganization, ...updateWithNit }
      repository.findActiveById.mockResolvedValue(mockOrganization)
      validator.validateUniqueNit.mockResolvedValue(undefined)
      repository.save.mockResolvedValue(updatedOrg)

      // Act
      await service.update('1', updateWithNit)

      // Assert
      expect(validator.validateUniqueNit).toHaveBeenCalledWith(updateWithNit.nit, '1')
    })

    it('should not validate name if it has not changed', async () => {
      // Arrange
      const updateDto: UpdateOrganizationDto = { description: 'New desc' }
      repository.findActiveById.mockResolvedValue(mockOrganization)
      repository.save.mockResolvedValue(mockOrganization)

      // Act
      await service.update('1', updateDto)

      // Assert
      expect(validator.validateUniqueName).not.toHaveBeenCalled()
      expect(validator.validateUniqueNit).not.toHaveBeenCalled()
    })

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.update('999', updateDto)).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('uploadLogo', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'logo.png',
      mimetype: 'image/png',
      size: 1024,
    } as Express.Multer.File

    it('should upload logo successfully', async () => {
      // Arrange
      const uploadResult = {
        fileName: 'org-1.png',
        filePath: 'organizations/logos/org-1.png',
        url: 'http://localhost:3000/uploads/organizations/logos/org-1.png',
        size: 1024,
        mimeType: 'image/png',
      }
      const orgWithLogo = {
        ...mockOrganization,
        logoUrl: uploadResult.filePath,
      }

      repository.findActiveById.mockResolvedValue(mockOrganization)
      filesService.replaceFile.mockResolvedValue(uploadResult)
      repository.save.mockResolvedValue(orgWithLogo)

      // Act
      const result = await service.uploadLogo('1', mockFile)

      // Assert
      expect(filesService.replaceFile).toHaveBeenCalledWith(
        null, // mockOrganization.logoUrl es null (sin logo previo)
        expect.objectContaining({
          file: mockFile,
          folder: 'organizations/logos',
          customFileName: 'org-1',
          overwrite: true,
          validationOptions: expect.objectContaining({
            fileType: 'image',
            maxSize: 5 * 1024 * 1024,
            maxWidth: 1024,
            maxHeight: 1024,
          }),
        }),
      )
      expect(repository.save).toHaveBeenCalled()
      expect(result.logoUrl).toBe(uploadResult.filePath)
    })

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.uploadLogo('999', mockFile)).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('remove', () => {
    it('should soft delete organization when no active users', async () => {
      // Arrange
      const inactiveOrg = { ...mockOrganization, isActive: false }
      repository.findActiveById.mockResolvedValue(mockOrganization)
      repository.countActiveUsers.mockResolvedValue(0)
      repository.save.mockResolvedValue(inactiveOrg)

      // Act
      await service.remove('1')

      // Assert
      expect(repository.countActiveUsers).toHaveBeenCalledWith('1')
      expect(repository.save).toHaveBeenCalled()
    })

    it('should throw OrganizationHasActiveUsersException when organization has active users', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(mockOrganization)
      repository.countActiveUsers.mockResolvedValue(5)

      // Act & Assert
      await expect(service.remove('1')).rejects.toThrow(
        OrganizationHasActiveUsersException,
      )
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      // Arrange
      repository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('999')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('delete', () => {
    it('should hard delete organization', async () => {
      // Arrange
      repository.hardDelete.mockResolvedValue(undefined)

      // Act
      await service.delete('1')

      // Assert
      expect(repository.hardDelete).toHaveBeenCalledWith('1')
    })
  })
})
