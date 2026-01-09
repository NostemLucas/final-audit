import { Test, TestingModule } from '@nestjs/testing'
import { OrganizationValidator } from './organization.validator'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../repositories'
import { OrganizationEntity } from '../entities/organization.entity'
import {
  DuplicateOrganizationNameException,
  DuplicateOrganizationNitException,
} from '../exceptions'

describe('OrganizationValidator', () => {
  let validator: OrganizationValidator
  let repository: jest.Mocked<IOrganizationRepository>

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
    deletedAt: null,
  } as OrganizationEntity

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IOrganizationRepository>> = {
      findByNit: jest.fn(),
      findByName: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationValidator,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile()

    validator = module.get<OrganizationValidator>(OrganizationValidator)
    repository = module.get(ORGANIZATION_REPOSITORY)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUniqueNit', () => {
    it('should pass validation when NIT does not exist', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.validateUniqueNit('999999999'),
      ).resolves.not.toThrow()
      expect(repository.findByNit).toHaveBeenCalledWith('999999999')
    })

    it('should throw DuplicateOrganizationNitException when NIT already exists', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(validator.validateUniqueNit('123456789')).rejects.toThrow(
        new DuplicateOrganizationNitException('123456789'),
      )
    })

    it('should pass validation when NIT exists but belongs to the same organization (excludeId)', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueNit('123456789', '1'),
      ).resolves.not.toThrow()
    })

    it('should throw DuplicateOrganizationNitException when NIT exists and excludeId is different', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueNit('123456789', '2'),
      ).rejects.toThrow(DuplicateOrganizationNitException)
    })
  })

  describe('validateUniqueName', () => {
    it('should pass validation when name does not exist', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.validateUniqueName('New Organization'),
      ).resolves.not.toThrow()
      expect(repository.findByName).toHaveBeenCalledWith('New Organization')
    })

    it('should throw DuplicateOrganizationNameException when name already exists', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization'),
      ).rejects.toThrow(
        new DuplicateOrganizationNameException('Test Organization'),
      )
    })

    it('should pass validation when name exists but belongs to the same organization (excludeId)', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization', '1'),
      ).resolves.not.toThrow()
    })

    it('should throw DuplicateOrganizationNameException when name exists and excludeId is different', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization', '2'),
      ).rejects.toThrow(DuplicateOrganizationNameException)
    })
  })

  describe('validateUniqueConstraints', () => {
    it('should validate both name and NIT in parallel', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null)
      repository.findByNit.mockResolvedValue(null)

      // Act
      await validator.validateUniqueConstraints('New Org', '999999999')

      // Assert
      expect(repository.findByName).toHaveBeenCalledWith('New Org')
      expect(repository.findByNit).toHaveBeenCalledWith('999999999')
    })

    it('should throw DuplicateOrganizationNameException when name validation fails', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)
      repository.findByNit.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints('Test Organization', '999999999'),
      ).rejects.toThrow(DuplicateOrganizationNameException)
    })

    it('should throw DuplicateOrganizationNitException when NIT validation fails', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null)
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints('New Org', '123456789'),
      ).rejects.toThrow(DuplicateOrganizationNitException)
    })

    it('should pass validation with excludeId for both constraints', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints(
          'Test Organization',
          '123456789',
          '1',
        ),
      ).resolves.not.toThrow()
    })
  })
})
