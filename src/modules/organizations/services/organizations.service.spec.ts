import { OrganizationsService } from './organizations.service'
import { OrganizationValidator } from '../validators/organization.validator'
import { OrganizationFactory } from '../factories/organization.factory'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'
import {
  OrganizationNotFoundException,
  DuplicateOrganizationNameException,
  DuplicateOrganizationNitException,
  OrganizationHasActiveUsersException,
} from '../exceptions'
import { FilesService } from '@core/files'
import { FakeOrganizationsRepository } from '../__tests__/fixtures/fake-organizations.repository'
import {
  TEST_ORGANIZATIONS,
  OrganizationBuilder,
  createMultipleOrganizations,
} from '../__tests__/fixtures/organization.fixtures'

/**
 * ✅ INTEGRATION TESTS - OrganizationsService (with Fake Repository)
 *
 * Testing approach:
 * - Fake Repository: Simulates DB in memory (REAL behavior)
 * - Real Validator: Tests actual validation logic
 * - Real Factory: Tests actual normalization logic
 * - Mock FilesService: Only mock external dependencies
 *
 * This approach is much more reliable than mocking everything!
 */
describe('OrganizationsService (Integration)', () => {
  let service: OrganizationsService
  let fakeRepository: FakeOrganizationsRepository
  let validator: OrganizationValidator
  let factory: OrganizationFactory
  let filesService: jest.Mocked<FilesService>

  beforeEach(() => {
    // ✅ Create fake repository (works like DB in memory)
    fakeRepository = new FakeOrganizationsRepository()

    // Mock only external dependencies
    filesService = {
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
    } as any

    // ✅ Use REAL instances of business logic
    validator = new OrganizationValidator(fakeRepository)
    factory = new OrganizationFactory()

    service = new OrganizationsService(
      fakeRepository,
      validator,
      factory,
      filesService,
    )
  })

  afterEach(() => {
    fakeRepository.clear() // Clean data between tests
  })

  describe('create', () => {
    it('should create organization with real validation and normalization', async () => {
      // Arrange - Seed with existing data using fixtures
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])

      const newOrgDto: CreateOrganizationDto = {
        name: 'nueva empresa',
        nit: '9999-888 777', // With spaces, will be normalized
        description: 'Nueva descripción',
        address: 'Nueva dirección',
        phone: '79999999',
        email: 'NUEVA@test.com', // UPPERCASE, will be normalized
      }

      // Act
      const result = await service.create(newOrgDto)

      // Assert - ✅ Organization saved REALLY in fake repo
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Nueva Empresa') // Factory normalized
      expect(result.nit).toBe('9999-888777') // Factory normalized
      expect(result.email).toBe('nueva@test.com') // Factory normalized

      // ✅ Verify it's really in the repo
      const savedOrg = await fakeRepository.findById(result.id)
      expect(savedOrg).toBeDefined()
      expect(savedOrg!.name).toBe('Nueva Empresa')

      // ✅ Verify total count
      const allOrgs = await fakeRepository.findAll()
      expect(allOrgs.length).toBeGreaterThanOrEqual(2)
    })

    it('should throw DuplicateOrganizationNameException when name is duplicate', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

      const duplicateDto: CreateOrganizationDto = {
        name: TEST_ORGANIZATIONS.ORG_1.name, // ❌ Duplicate name
        nit: '9999999999',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'different@test.com',
      }

      // Act & Assert - ✅ Validator executes REAL search in fake repo
      await expect(service.create(duplicateDto)).rejects.toThrow(
        DuplicateOrganizationNameException,
      )

      // ✅ Verify organization was NOT created
      expect(fakeRepository.count()).toBe(1) // Only the seeded one
    })

    it('should throw DuplicateOrganizationNitException when NIT is duplicate', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

      const duplicateDto: CreateOrganizationDto = {
        name: 'Nombre Diferente',
        nit: TEST_ORGANIZATIONS.ORG_1.nit, // ❌ Duplicate NIT
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'different@test.com',
      }

      // Act & Assert
      await expect(service.create(duplicateDto)).rejects.toThrow(
        DuplicateOrganizationNitException,
      )

      expect(fakeRepository.count()).toBe(1)
    })

    it('should work with OrganizationBuilder for custom scenarios', async () => {
      // Arrange - Create custom organization with builder
      const existingOrg = new OrganizationBuilder()
        .withName('Existing Org')
        .withNit('1111111111')
        .withEmail('existing@test.com')
        .complete()
        .build()

      fakeRepository.seed([existingOrg])

      const newOrgDto: CreateOrganizationDto = {
        name: 'New Org',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'new@test.com',
      }

      // Act
      const result = await service.create(newOrgDto)

      // Assert
      expect(result.id).toBeDefined()
      expect(fakeRepository.count()).toBe(2)

      // ✅ Can make real queries
      const allOrgs = await fakeRepository.findAll()
      expect(allOrgs).toHaveLength(2)

      const foundByNit = await fakeRepository.findByNit('2222222222')
      expect(foundByNit!.id).toBe(result.id)
    })
  })

  describe('update', () => {
    it('should update organization with real validation', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])

      const updateDto: UpdateOrganizationDto = {
        name: 'empresa actualizada',
        description: 'Descripción actualizada',
      }

      // Act
      const result = await service.update(TEST_ORGANIZATIONS.ORG_1.id, updateDto)

      // Assert
      expect(result.name).toBe('Empresa Actualizada') // Factory normalized
      expect(result.description).toBe('Descripción actualizada')

      // ✅ Verify change persisted in repo
      const updatedOrg = await fakeRepository.findById(TEST_ORGANIZATIONS.ORG_1.id)
      expect(updatedOrg!.name).toBe('Empresa Actualizada')
      expect(updatedOrg!.description).toBe('Descripción actualizada')
    })

    it('should allow updating to same name (excludeId works)', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

      const updateDto: UpdateOrganizationDto = {
        name: TEST_ORGANIZATIONS.ORG_1.name, // Same name (should allow)
        description: 'Nueva descripción',
      }

      // Act
      const result = await service.update(TEST_ORGANIZATIONS.ORG_1.id, updateDto)

      // Assert - ✅ Validator REAL allows updating with same name
      expect(result.name).toBe('Empresa De Auditoría Principal')
      expect(result.description).toBe('Nueva descripción')
    })

    it('should prevent updating to name of another organization', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])

      const updateDto: UpdateOrganizationDto = {
        name: TEST_ORGANIZATIONS.ORG_2.name, // ❌ Name of another org
      }

      // Act & Assert
      await expect(
        service.update(TEST_ORGANIZATIONS.ORG_1.id, updateDto),
      ).rejects.toThrow(DuplicateOrganizationNameException)
    })
  })

  describe('findAll', () => {
    it('should return all active organizations', async () => {
      // Arrange
      fakeRepository.seed([
        TEST_ORGANIZATIONS.ORG_1,
        TEST_ORGANIZATIONS.ORG_2,
        TEST_ORGANIZATIONS.INACTIVE_ORG,
      ])

      // Act
      const result = await service.findAll()

      // Assert - ✅ Only returns active organizations
      expect(result).toHaveLength(2) // ORG_1 and ORG_2 (active)
      expect(result.map((o) => o.id)).toContain(TEST_ORGANIZATIONS.ORG_1.id)
      expect(result.map((o) => o.id)).toContain(TEST_ORGANIZATIONS.ORG_2.id)
      expect(result.map((o) => o.id)).not.toContain(TEST_ORGANIZATIONS.INACTIVE_ORG.id)
    })

    it('should return empty array when no organizations exist', async () => {
      // Act
      const result = await service.findAll()

      // Assert
      expect(result).toEqual([])
      expect(fakeRepository.count()).toBe(0)
    })
  })

  describe('findOne', () => {
    it('should return organization by id', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])

      // Act
      const result = await service.findOne(TEST_ORGANIZATIONS.ORG_1.id)

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBe(TEST_ORGANIZATIONS.ORG_1.id)
      expect(result.name).toBe(TEST_ORGANIZATIONS.ORG_1.name)
    })

    it('should throw OrganizationNotFoundException when not found', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

      // Act & Assert
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })

    it('should throw when organization is inactive', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.INACTIVE_ORG])

      // Act & Assert
      await expect(
        service.findOne(TEST_ORGANIZATIONS.INACTIVE_ORG.id),
      ).rejects.toThrow(OrganizationNotFoundException)
    })
  })

  describe('findByNit', () => {
    it('should find organization by NIT', async () => {
      // Arrange
      fakeRepository.seed([
        TEST_ORGANIZATIONS.ORG_1,
        TEST_ORGANIZATIONS.ORG_2,
        TEST_ORGANIZATIONS.INACTIVE_ORG,
      ])

      // Act
      const result = await service.findByNit(TEST_ORGANIZATIONS.ORG_2.nit)

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBe(TEST_ORGANIZATIONS.ORG_2.id)
      expect(result.nit).toBe(TEST_ORGANIZATIONS.ORG_2.nit)
    })

    it('should throw when organization not found by NIT', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

      // Act & Assert
      await expect(service.findByNit('nonexistent-nit')).rejects.toThrow(
        OrganizationNotFoundException,
      )
    })
  })

  describe('remove (soft delete)', () => {
    it('should soft delete organization when no active users', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])
      fakeRepository.setActiveUsersCount(TEST_ORGANIZATIONS.ORG_1.id, 0) // No users

      // Act
      await service.remove(TEST_ORGANIZATIONS.ORG_1.id)

      // Assert - ✅ Organization marked as inactive
      const org = await fakeRepository.findById(TEST_ORGANIZATIONS.ORG_1.id)
      expect(org).toBeDefined()
      expect(org!.isActive).toBe(false)
    })

    it('should throw when organization has active users', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])
      fakeRepository.setActiveUsersCount(TEST_ORGANIZATIONS.ORG_1.id, 5) // ❌ Has users

      // Act & Assert
      await expect(service.remove(TEST_ORGANIZATIONS.ORG_1.id)).rejects.toThrow(
        OrganizationHasActiveUsersException,
      )

      // ✅ Verify still active
      const org = await fakeRepository.findById(TEST_ORGANIZATIONS.ORG_1.id)
      expect(org!.isActive).toBe(true)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete organization', async () => {
      // Arrange
      fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])

      // Act
      await service.delete(TEST_ORGANIZATIONS.ORG_1.id)

      // Assert - ✅ Organization REALLY deleted from repo
      const org = await fakeRepository.findById(TEST_ORGANIZATIONS.ORG_1.id)
      expect(org).toBeNull()

      // ✅ Other organizations not affected
      expect(fakeRepository.count()).toBe(1)
      const remaining = await fakeRepository.findAll()
      expect(remaining[0].id).toBe(TEST_ORGANIZATIONS.ORG_2.id)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple operations on same data', async () => {
      // ✅ Complex scenario: create, update, search, delete
      // With fake repo you don't need to mock each step

      // 1. Create organization
      const createDto: CreateOrganizationDto = {
        name: 'test org',
        nit: '123-456 789',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'TEST@test.com',
      }

      const created = await service.create(createDto)
      expect(created.id).toBeDefined()
      expect(created.name).toBe('Test Org') // Normalized

      // 2. Update
      const updateDto: UpdateOrganizationDto = {
        description: 'Updated description',
      }

      const updated = await service.update(created.id, updateDto)
      expect(updated.description).toBe('Updated description')

      // 3. Search by NIT
      const foundByNit = await service.findByNit('123-456789') // Normalized
      expect(foundByNit.id).toBe(created.id)

      // 4. Verify final state
      expect(fakeRepository.count()).toBe(1)
      const all = await fakeRepository.findAll()
      expect(all[0].description).toBe('Updated description')
    })

    it('should work with multiple organizations using helper', async () => {
      // ✅ Use helper to create multiple organizations
      const orgs = createMultipleOrganizations(5)
      fakeRepository.seed(orgs)

      // Act
      const all = await service.findAll()

      // Assert
      expect(all).toHaveLength(5)
      expect(all.map((o) => o.name)).toEqual([
        'Organization 1',
        'Organization 2',
        'Organization 3',
        'Organization 4',
        'Organization 5',
      ])
    })

    it('should handle normalization correctly', async () => {
      // Arrange
      const createDto: CreateOrganizationDto = {
        name: '  empresa   con   espacios  ',
        nit: '@#123-ABC xyz$%',
        description: null,
        address: null,
        phone: null,
        email: '  EMAIL@TEST.COM  ',
      }

      // Act
      const result = await service.create(createDto)

      // Assert - ✅ Factory normalized correctly
      expect(result.name).toBe('Empresa Con Espacios')
      expect(result.nit).toBe('123-ABCXYZ')
      expect(result.email).toBe('email@test.com')

      // ✅ Verify in repo
      const saved = await fakeRepository.findById(result.id)
      expect(saved!.name).toBe('Empresa Con Espacios')
    })
  })
})
