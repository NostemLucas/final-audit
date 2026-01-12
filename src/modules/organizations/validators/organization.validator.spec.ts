/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing'
import { OrganizationValidator } from './organization.validator'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../tokens'
import { OrganizationEntity } from '../entities/organization.entity'
import {
  NameAlreadyExistsException,
  NitAlreadyExistsException,
  OrganizationHasActiveUsersException,
  OrganizationNotFoundException,
} from '../exceptions'
import { USERS_REPOSITORY } from '../../users/tokens'
import type { IUsersRepository } from '../../users/repositories'

describe('OrganizationValidator', () => {
  let validator: OrganizationValidator
  let repository: jest.Mocked<IOrganizationRepository>
  let usersRepository: jest.Mocked<IUsersRepository>

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
    users: [],
  }

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IOrganizationRepository>> = {
      findByNit: jest.fn(),
      findByName: jest.fn(),
      findById: jest.fn(),
    }

    const mockUsersRepository: Partial<jest.Mocked<IUsersRepository>> = {
      countUsersByOrganization: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationValidator,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: USERS_REPOSITORY,
          useValue: mockUsersRepository,
        },
      ],
    }).compile()

    validator = module.get<OrganizationValidator>(OrganizationValidator)
    repository = module.get(ORGANIZATION_REPOSITORY)
    usersRepository = module.get(USERS_REPOSITORY)
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

    it('should throw NitAlreadyExistsException when NIT already exists', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(validator.validateUniqueNit('123456789')).rejects.toThrow(
        new NitAlreadyExistsException('123456789'),
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

    it('should throw NitAlreadyExistsException when NIT exists and excludeId is different', async () => {
      // Arrange
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueNit('123456789', '2'),
      ).rejects.toThrow(NitAlreadyExistsException)
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

    it('should throw NameAlreadyExistsException when name already exists', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization'),
      ).rejects.toThrow(new NameAlreadyExistsException('Test Organization'))
    })

    it('should pass validation when name exists but belongs to the same organization (excludeId)', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization', '1'),
      ).resolves.not.toThrow()
    })

    it('should throw NameAlreadyExistsException when name exists and excludeId is different', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Test Organization', '2'),
      ).rejects.toThrow(NameAlreadyExistsException)
    })
  })

  describe('ensureOrganizationExists', () => {
    it('should pass when organization exists', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockOrganization)
      // Act & Assert
      await expect(
        validator.ensureOrganizationExists('1'),
      ).resolves.not.toThrow()

      expect(repository.findById).toHaveBeenCalledWith('1')
    })
    it('should throw OrganizationNotFoundException when organization does not exist', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(validator.ensureOrganizationExists('2')).rejects.toThrow(
        OrganizationNotFoundException,
      )
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

    it('should throw NameAlreadyExistsException when name validation fails', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(mockOrganization)
      repository.findByNit.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints('Test Organization', '999999999'),
      ).rejects.toThrow(NameAlreadyExistsException)
    })

    it('should throw NitAlreadyExistsException when NIT validation fails', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null)
      repository.findByNit.mockResolvedValue(mockOrganization)

      // Act & Assert
      await expect(
        validator.validateUniqueConstraints('New Org', '123456789'),
      ).rejects.toThrow(NitAlreadyExistsException)
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

  describe('validateCanBeDeactivated', () => {
    it('should pass when organization has no active users', async () => {
      // Arrange
      usersRepository.countUsersByOrganization.mockResolvedValue(0)

      // Act & Assert
      await expect(
        validator.validateCanBeDeactivated('1'),
      ).resolves.not.toThrow()

      expect(usersRepository.countUsersByOrganization).toHaveBeenCalledWith('1')
    })
  })
  it('should throw OrganizationHasActiveUsersException when organization has active users', async () => {
    // Arrange
    usersRepository.countUsersByOrganization.mockResolvedValue(5)

    // Act & Assert
    await expect(validator.validateCanBeDeactivated('1')).rejects.toThrow(
      OrganizationHasActiveUsersException,
    )

    expect(usersRepository.countUsersByOrganization).toHaveBeenCalledWith('1')
  })
})
