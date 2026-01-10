import { Test, TestingModule } from '@nestjs/testing'
import { OrganizationsService } from './organizations.service'
import { OrganizationValidator } from '../validators/organization.validator'
import { OrganizationFactory } from '../factories/organization.factory'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'
import {
  OrganizationNotFoundException,
  OrganizationHasActiveUsersException,
} from '../exceptions'
import { FilesService } from '@core/files'
import { createMock } from '@core/testing'
import {
  TEST_ORGANIZATIONS,
  createTestOrganization,
} from '../__tests__/fixtures/organization.fixtures'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../repositories'

/**
 * ✅ UNIT TESTS - OrganizationsService (with Jest Mocks)
 *
 * Testing approach:
 * - Mock Repository: Solo mockeamos comportamiento necesario
 * - Mock Validator: Mockeamos validaciones
 * - Real Factory: Usamos factory real para probar normalizaciones
 * - Mock FilesService: Mockeamos dependencia externa
 *
 * Ventajas sobre Fake Repository:
 * - ~240 líneas menos de código de test
 * - Tests más rápidos (sin lógica de fake)
 * - Tests más claros (ves exactamente qué se llama)
 * - Enfoque: Probar SOLO la lógica de orquestación del servicio
 */
describe('OrganizationsService', () => {
  let service: OrganizationsService
  let mockRepository: jest.Mocked<IOrganizationRepository>
  let mockValidator: jest.Mocked<OrganizationValidator>
  let factory: OrganizationFactory // ✅ Real factory para probar normalizaciones
  let mockFilesService: jest.Mocked<FilesService>

  beforeEach(async () => {
    // ✅ Crear mocks simples con Jest
    mockRepository = createMock<IOrganizationRepository>({
      save: jest.fn(),
      findAllActive: jest.fn(),
      findActiveById: jest.fn(),
      findActiveByNit: jest.fn(),
      countActiveUsers: jest.fn(),
      hardDelete: jest.fn(),
      findWithFilters: jest.fn(),
    })

    mockValidator = createMock<OrganizationValidator>({
      validateUniqueConstraints: jest.fn(),
      validateUniqueName: jest.fn(),
      validateUniqueNit: jest.fn(),
    })

    mockFilesService = createMock<FilesService>({
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
    })

    // ✅ Usar factory REAL para probar normalizaciones
    factory = new OrganizationFactory()

    // Crear módulo de testing
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
          provide: OrganizationFactory,
          useValue: factory,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile()

    service = module.get<OrganizationsService>(OrganizationsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create organization with real normalization', async () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'nueva empresa', // lowercase
        nit: '9999-888 777', // con espacios
        description: 'Nueva descripción',
        address: 'Nueva dirección',
        phone: '79999999',
        email: 'NUEVA@test.com', // UPPERCASE
      }

      const savedOrg = createTestOrganization({
        id: 'org-123',
        name: 'Nueva Empresa', // ✅ Factory normaliza
        nit: '9999-888777', // ✅ Factory normaliza
        email: 'nueva@test.com', // ✅ Factory normaliza
      })

      // ✅ Mock: validación pasa sin error
      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)

      // ✅ Mock: repository guarda y retorna con ID
      mockRepository.save.mockResolvedValue(savedOrg)

      // Act - Prueba la ORQUESTACIÓN del servicio
      const result = await service.create(dto)

      // Assert - Verifica que el servicio coordinó correctamente
      expect(mockValidator.validateUniqueConstraints).toHaveBeenCalledWith(
        dto.name,
        dto.nit,
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nueva Empresa',
          nit: '9999-888777',
          email: 'nueva@test.com',
        }),
      )
      expect(result).toEqual(savedOrg)
    })

    it('should propagate validation error when name is duplicate', async () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Duplicate Name',
        nit: '9999999999',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'test@test.com',
      }

      const validationError = new Error('Duplicate name')
      mockValidator.validateUniqueConstraints.mockRejectedValue(validationError)

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow('Duplicate name')

      // ✅ Verificamos que NO se llamó a save (validación falló antes)
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all active organizations from repository', async () => {
      // Arrange
      const activeOrgs = [TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2]
      mockRepository.findAllActive.mockResolvedValue(activeOrgs)

      // Act
      const result = await service.findAll()

      // Assert
      expect(mockRepository.findAllActive).toHaveBeenCalledTimes(1)
      expect(result).toEqual(activeOrgs)
    })

    it('should return empty array when no organizations exist', async () => {
      // Arrange
      mockRepository.findAllActive.mockResolvedValue([])

      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return organization by id', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_1
      mockRepository.findActiveById.mockResolvedValue(org)

      // Act
      const result = await service.findOne(org.id)

      // Assert
      expect(mockRepository.findActiveById).toHaveBeenCalledWith(org.id)
      expect(result).toEqual(org)
    })

    it('should throw OrganizationNotFoundException when not found', async () => {
      // Arrange
      mockRepository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })

    it('should throw when organization is inactive', async () => {
      // Arrange
      // Mock retorna null porque findActiveById no retorna inactivas
      mockRepository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(
        service.findOne(TEST_ORGANIZATIONS.INACTIVE_ORG.id),
      ).rejects.toThrow(OrganizationNotFoundException)
    })
  })

  describe('findByNit', () => {
    it('should find organization by NIT', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_2
      mockRepository.findActiveByNit.mockResolvedValue(org)

      // Act
      const result = await service.findByNit(org.nit)

      // Assert
      expect(mockRepository.findActiveByNit).toHaveBeenCalledWith(org.nit)
      expect(result).toEqual(org)
    })

    it('should throw when organization not found by NIT', async () => {
      // Arrange
      mockRepository.findActiveByNit.mockResolvedValue(null)

      // Act & Assert
      await expect(service.findByNit('nonexistent-nit')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('update', () => {
    it('should update organization correctly', async () => {
      // Arrange
      const orgId = 'org-1'
      const updateDto: UpdateOrganizationDto = {
        name: 'empresa actualizada',
        description: 'Descripción actualizada',
      }

      const existingOrg = createTestOrganization({
        id: orgId,
        name: 'Empresa Original',
      })

      const updatedOrg = {
        ...existingOrg,
        name: 'Empresa Actualizada', // ✅ Factory normaliza
        description: 'Descripción actualizada',
      }

      mockRepository.findActiveById.mockResolvedValue(existingOrg)
      mockValidator.validateUniqueName.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue(updatedOrg)

      // Act
      const result = await service.update(orgId, updateDto)

      // Assert - Verifica la orquestación
      expect(mockRepository.findActiveById).toHaveBeenCalledWith(orgId)
      expect(mockValidator.validateUniqueName).toHaveBeenCalledWith(
        updateDto.name,
        orgId,
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Empresa Actualizada',
          description: 'Descripción actualizada',
        }),
      )
      expect(result).toEqual(updatedOrg)
    })

    it('should allow updating to same name (no validation)', async () => {
      // Arrange
      const orgId = 'org-1'
      const existingOrg = createTestOrganization({
        id: orgId,
        name: 'Empresa Original',
      })

      const updateDto: UpdateOrganizationDto = {
        name: existingOrg.name, // Mismo nombre
        description: 'Nueva descripción',
      }

      const updatedOrg = {
        ...existingOrg,
        description: 'Nueva descripción',
      }

      mockRepository.findActiveById.mockResolvedValue(existingOrg)
      mockRepository.save.mockResolvedValue(updatedOrg)

      // Act
      await service.update(orgId, updateDto)

      // Assert - NO se valida el nombre (es el mismo)
      expect(mockValidator.validateUniqueName).not.toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should throw OrganizationNotFoundException when org does not exist', async () => {
      // Arrange
      const orgId = 'nonexistent'
      const updateDto: UpdateOrganizationDto = { name: 'Updated' }

      mockRepository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.update(orgId, updateDto)).rejects.toThrow(
        OrganizationNotFoundException,
      )

      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should validate name when changed', async () => {
      // Arrange
      const orgId = 'org-1'
      const existingOrg = createTestOrganization({
        id: orgId,
        name: 'Original Name',
      })

      const updateDto: UpdateOrganizationDto = {
        name: 'New Name', // ✅ Nombre diferente
      }

      mockRepository.findActiveById.mockResolvedValue(existingOrg)
      mockValidator.validateUniqueName.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...existingOrg,
        name: 'New Name',
      })

      // Act
      await service.update(orgId, updateDto)

      // Assert - SÍ se valida porque cambió
      expect(mockValidator.validateUniqueName).toHaveBeenCalledWith(
        updateDto.name,
        orgId,
      )
    })

    it('should validate NIT when changed', async () => {
      // Arrange
      const orgId = 'org-1'
      const existingOrg = createTestOrganization({
        id: orgId,
        nit: '1234567890',
      })

      const updateDto: UpdateOrganizationDto = {
        nit: '9999999999', // ✅ NIT diferente
      }

      mockRepository.findActiveById.mockResolvedValue(existingOrg)
      mockValidator.validateUniqueNit.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...existingOrg,
        nit: '9999999999',
      })

      // Act
      await service.update(orgId, updateDto)

      // Assert - SÍ se valida porque cambió
      expect(mockValidator.validateUniqueNit).toHaveBeenCalledWith(
        updateDto.nit,
        orgId,
      )
    })
  })

  describe('remove (soft delete)', () => {
    it('should soft delete organization when no active users', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_1

      mockRepository.findActiveById.mockResolvedValue(org)
      mockRepository.countActiveUsers.mockResolvedValue(0) // ✅ Sin usuarios
      mockRepository.save.mockResolvedValue({ ...org, isActive: false })

      // Act
      await service.remove(org.id)

      // Assert
      expect(mockRepository.findActiveById).toHaveBeenCalledWith(org.id)
      expect(mockRepository.countActiveUsers).toHaveBeenCalledWith(org.id)
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      )
    })

    it('should throw when organization has active users', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_1

      mockRepository.findActiveById.mockResolvedValue(org)
      mockRepository.countActiveUsers.mockResolvedValue(5) // ❌ Tiene usuarios

      // Act & Assert
      await expect(service.remove(org.id)).rejects.toThrow(
        OrganizationHasActiveUsersException,
      )

      // ✅ No se llamó a save
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should throw when organization not found', async () => {
      // Arrange
      mockRepository.findActiveById.mockResolvedValue(null)

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete organization', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_1
      mockRepository.hardDelete.mockResolvedValue(undefined)

      // Act
      await service.delete(org.id)

      // Assert
      expect(mockRepository.hardDelete).toHaveBeenCalledWith(org.id)
    })
  })

  describe('uploadLogo', () => {
    it('should upload logo and update organization', async () => {
      // Arrange
      const org = TEST_ORGANIZATIONS.ORG_1
      const mockFile = {
        filename: 'logo.png',
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File

      const uploadResult = {
        filePath: 'organizations/logos/org-1.png',
        fileName: 'org-1.png',
        fileSize: 1024,
        url: 'http://localhost/organizations/logos/org-1.png',
        size: 1024,
        mimeType: 'image/png',
      }

      mockRepository.findActiveById.mockResolvedValue(org)
      mockFilesService.replaceFile.mockResolvedValue(uploadResult as any)
      mockRepository.save.mockResolvedValue({
        ...org,
        logoUrl: uploadResult.filePath,
      })

      // Act
      const result = await service.uploadLogo(org.id, mockFile)

      // Assert
      expect(mockRepository.findActiveById).toHaveBeenCalledWith(org.id)
      expect(mockFilesService.replaceFile).toHaveBeenCalledWith(
        org.logoUrl,
        expect.objectContaining({
          file: mockFile,
          folder: 'organizations/logos',
          customFileName: `org-${org.id}`,
        }),
      )
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          logoUrl: uploadResult.filePath,
        }),
      )
      expect(result.logoUrl).toBe(uploadResult.filePath)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle normalization correctly with real factory', async () => {
      // Arrange - DTO con datos que requieren normalización
      const dto: CreateOrganizationDto = {
        name: '  empresa   con   espacios  ',
        nit: '@#123-ABC xyz$%',
        description: undefined,
        address: undefined,
        phone: undefined,
        email: '  EMAIL@TEST.COM  ',
      }

      mockValidator.validateUniqueConstraints.mockResolvedValue(undefined)

      // Capturamos qué recibe el repository.save
      let savedData: any
      mockRepository.save.mockImplementation(async (data: any) => {
        savedData = data
        return { ...data, id: 'org-123' } as any
      })

      // Act
      await service.create(dto)

      // Assert - ✅ Factory normalizó correctamente
      expect(savedData.name).toBe('Empresa Con Espacios')
      expect(savedData.nit).toBe('123-ABCXYZ')
      expect(savedData.email).toBe('email@test.com')
    })
  })
})
