import { Test, TestingModule } from '@nestjs/testing'
import { CreateOrganizationUseCase } from './create-organization.use-case'
import { OrganizationValidator } from '../../validators/organization.validator'
import { OrganizationFactory } from '../../factories/organization.factory'
import { CreateOrganizationDto } from '../../dtos'
import { OrganizationEntity } from '../../entities/organization.entity'
import { ORGANIZATION_REPOSITORY } from '../../repositories'
import type { IOrganizationRepository } from '../../repositories'
import { createMock } from '@core/testing'

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase
  let mockRepository: jest.Mocked<IOrganizationRepository>
  let mockValidator: jest.Mocked<OrganizationValidator>
  let factory: OrganizationFactory

  beforeEach(async () => {
    mockRepository = createMock<IOrganizationRepository>({
      save: jest.fn(),
    })

    mockValidator = createMock<OrganizationValidator>({
      validateUniqueConstraints: jest.fn(),
    })

    factory = new OrganizationFactory()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: OrganizationValidator,
          useValue: mockValidator,
        },
        {
          provide: OrganizationFactory,
          useValue: factory,
        },
      ],
    }).compile()

    useCase = module.get<CreateOrganizationUseCase>(CreateOrganizationUseCase)
  })

  describe('execute', () => {
    const createDto: CreateOrganizationDto = {
      name: 'Test Organization',
      nit: '1234567890',
      description: 'Test description',
      address: 'Test address',
      phone: '71234567',
      email: 'test@test.com',
    }

    it('should create organization successfully', async () => {
      // Arrange
      const expectedOrg = new OrganizationEntity()
      expectedOrg.id = 'org-1'
      expectedOrg.name = 'Test Organization'

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue(expectedOrg)

      // Act
      const result = await useCase.execute(createDto)

      // Assert
      expect(mockValidator.validateUniqueConstraints).toHaveBeenCalledWith(
        createDto.name,
        createDto.nit,
      )
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toEqual(expectedOrg)
    })

    it('should normalize name with proper capitalization', async () => {
      // Arrange
      const dtoWithLowercaseName: CreateOrganizationDto = {
        ...createDto,
        name: 'test organization inc',
      }

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((org) =>
        Promise.resolve(org as OrganizationEntity),
      )

      // Act
      await useCase.execute(dtoWithLowercaseName)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Organization Inc',
        }),
      )
    })

    it('should normalize NIT to uppercase and remove spaces', async () => {
      // Arrange
      const dtoWithMessyNit: CreateOrganizationDto = {
        ...createDto,
        nit: '  abc-123  xyz  ',
      }

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((org) =>
        Promise.resolve(org as OrganizationEntity),
      )

      // Act
      await useCase.execute(dtoWithMessyNit)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nit: 'ABC-123XYZ',
        }),
      )
    })

    it('should normalize email to lowercase', async () => {
      // Arrange
      const dtoWithUppercaseEmail: CreateOrganizationDto = {
        ...createDto,
        email: 'TEST@TEST.COM',
      }

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)
      mockRepository.save.mockImplementation((org) =>
        Promise.resolve(org as OrganizationEntity),
      )

      // Act
      await useCase.execute(dtoWithUppercaseEmail)

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
        }),
      )
    })

    it('should throw error if name already exists', async () => {
      // Arrange
      const error = new Error('Name already exists')
      mockValidator.validateUniqueConstraints.mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(createDto)).rejects.toThrow(
        'Name already exists',
      )
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should throw error if NIT already exists', async () => {
      // Arrange
      const error = new Error('NIT already exists')
      mockValidator.validateUniqueConstraints.mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(createDto)).rejects.toThrow(
        'NIT already exists',
      )
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })
})
