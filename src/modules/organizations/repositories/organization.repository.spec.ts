import { DataSource } from 'typeorm'
import {
  createInMemoryDataSource,
  cleanDatabase,
} from '@core/testing/test-database.helper'
import { OrganizationRepository } from './organization.repository'
import { OrganizationEntity } from '../entities/organization.entity'
import { UserEntity, UserStatus, Role } from '../../users/entities/user.entity'
import { ClsService } from 'nestjs-cls'

/**
 * ✅ REPOSITORY TESTS - OrganizationRepository con SQLite In-Memory
 *
 * ¿Por qué probar repositorios?
 * - Los repositorios tienen lógica SQL (queries, joins, counts)
 * - El fake repository NO ejecuta SQL real
 * - Necesitamos probar que los queries funcionan
 *
 * ¿Por qué SQLite in-memory?
 * - DB real (prueba TypeORM y SQL)
 * - Rápido (en memoria, no disco)
 * - Sin Docker (más simple)
 * - Apropiado para probar queries
 */
describe('OrganizationRepository (SQLite In-Memory)', () => {
  let repository: OrganizationRepository
  let userRepository: any // Repository<UserEntity>
  let dataSource: DataSource
  let clsService: ClsService

  beforeAll(async () => {
    // ✅ Crear DB SQLite en memoria
    dataSource = await createInMemoryDataSource([
      OrganizationEntity,
      UserEntity,
    ])

    // Mock CLS (no lo necesitamos para tests de repositorio)
    clsService = {
      get: jest.fn().mockReturnValue(null),
    } as any

    // Crear repositorios
    repository = new OrganizationRepository(
      dataSource.getRepository(OrganizationEntity),
      clsService,
    )

    userRepository = dataSource.getRepository(UserEntity)
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  afterEach(async () => {
    // Limpiar DB entre tests
    await cleanDatabase(dataSource)
  })

  describe('findByNit', () => {
    it('should find organization by NIT', async () => {
      // Arrange - Crear organización en DB real
      const org = await repository.save({
        name: 'Test Organization',
        nit: '1234567890',
        description: 'Test description',
        address: 'Test address',
        phone: '71234567',
        email: 'test@test.com',
        isActive: true,
      })

      // Act - Buscar por NIT usando método del repositorio
      const found = await repository.findByNit('1234567890')

      // Assert - ✅ Ejecutó query SQL real
      expect(found).toBeDefined()
      expect(found!.id).toBe(org.id)
      expect(found!.name).toBe('Test Organization')
      expect(found!.nit).toBe('1234567890')
    })

    it('should return null when NIT not found', async () => {
      // Act
      const found = await repository.findByNit('nonexistent')

      // Assert
      expect(found).toBeNull()
    })

    it('should find organization even if soft deleted', async () => {
      // Arrange - Crear organización eliminada (soft delete)
      const org = await repository.save({
        name: 'Deleted Org',
        nit: '9999999999',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'deleted@test.com',
        isActive: true,
        deletedAt: new Date(), // ✅ Soft deleted
      })

      // Act - findByNit no filtra por deletedAt
      const found = await repository.findByNit('9999999999')

      // Assert - ✅ Lo encuentra igual (no hay filtro deletedAt en el método)
      expect(found).toBeDefined()
      expect(found!.id).toBe(org.id)
    })
  })

  describe('findByName', () => {
    it('should find organization by name', async () => {
      // Arrange
      const org = await repository.save({
        name: 'Unique Organization Name',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'unique@test.com',
        isActive: true,
      })

      // Act
      const found = await repository.findByName('Unique Organization Name')

      // Assert
      expect(found).toBeDefined()
      expect(found!.id).toBe(org.id)
      expect(found!.name).toBe('Unique Organization Name')
    })

    it('should return null when name not found', async () => {
      // Act
      const found = await repository.findByName('Nonexistent Name')

      // Assert
      expect(found).toBeNull()
    })

    it('should be case-sensitive', async () => {
      // Arrange
      await repository.save({
        name: 'Test Organization',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'test2@test.com',
        isActive: true,
      })

      // Act - Buscar con diferente case
      const found = await repository.findByName('test organization')

      // Assert - SQLite es case-insensitive por defecto, pero TypeORM hace match exacto
      expect(found).toBeNull()
    })
  })

  describe('findAllActive', () => {
    it('should find all active organizations', async () => {
      // Arrange - Crear múltiples organizaciones
      await repository.save({
        name: 'Active Org 1',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'active1@test.com',
        isActive: true,
      })

      await repository.save({
        name: 'Active Org 2',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71234568',
        email: 'active2@test.com',
        isActive: true,
      })

      await repository.save({
        name: 'Inactive Org',
        nit: '3333333333',
        description: 'Test',
        address: 'Test',
        phone: '71234569',
        email: 'inactive@test.com',
        isActive: false, // ❌ Inactiva
      })

      // Act
      const activeOrgs = await repository.findAllActive()

      // Assert - ✅ Solo retorna activas
      expect(activeOrgs).toHaveLength(2)
      expect(activeOrgs.map((o) => o.name)).toEqual([
        'Active Org 2', // Orden DESC por createdAt
        'Active Org 1',
      ])
    })

    it('should return empty array when no active organizations', async () => {
      // Arrange - Solo inactivas
      await repository.save({
        name: 'Inactive Org',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'inactive@test.com',
        isActive: false,
      })

      // Act
      const activeOrgs = await repository.findAllActive()

      // Assert
      expect(activeOrgs).toEqual([])
    })

    it('should load users relation', async () => {
      // Arrange - Crear organización con usuarios
      const org = await repository.save({
        name: 'Org with Users',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'org@test.com',
        isActive: true,
      })

      // Crear usuarios
      await userRepository.save({
        names: 'User 1',
        lastNames: 'Test',
        email: 'user1@test.com',
        username: 'user1',
        ci: '11111111',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      await userRepository.save({
        names: 'User 2',
        lastNames: 'Test',
        email: 'user2@test.com',
        username: 'user2',
        ci: '22222222',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      // Act
      const orgs = await repository.findAllActive()

      // Assert - ✅ Carga relación users
      expect(orgs).toHaveLength(1)
      expect(orgs[0].users).toBeDefined()
      expect(orgs[0].users).toHaveLength(2)
    })
  })

  describe('findActiveById', () => {
    it('should find active organization by id', async () => {
      // Arrange
      const org = await repository.save({
        name: 'Active Org',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'active@test.com',
        isActive: true,
      })

      // Act
      const found = await repository.findActiveById(org.id)

      // Assert
      expect(found).toBeDefined()
      expect(found!.id).toBe(org.id)
      expect(found!.isActive).toBe(true)
    })

    it('should return null when organization is inactive', async () => {
      // Arrange - Crear organización inactiva
      const org = await repository.save({
        name: 'Inactive Org',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'inactive@test.com',
        isActive: false, // ❌ Inactiva
      })

      // Act
      const found = await repository.findActiveById(org.id)

      // Assert - No la encuentra porque no es activa
      expect(found).toBeNull()
    })

    it('should return null when id not found', async () => {
      // Act
      const found = await repository.findActiveById('nonexistent-id')

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('findActiveByNit', () => {
    it('should find active organization by NIT', async () => {
      // Arrange
      await repository.save({
        name: 'Active Org',
        nit: '1234567890',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'active@test.com',
        isActive: true,
      })

      // Act
      const found = await repository.findActiveByNit('1234567890')

      // Assert
      expect(found).toBeDefined()
      expect(found!.nit).toBe('1234567890')
      expect(found!.isActive).toBe(true)
    })

    it('should return null when organization is inactive', async () => {
      // Arrange
      await repository.save({
        name: 'Inactive Org',
        nit: '9999999999',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'inactive@test.com',
        isActive: false, // ❌ Inactiva
      })

      // Act
      const found = await repository.findActiveByNit('9999999999')

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('countActiveUsers', () => {
    it('should count only active users', async () => {
      // Arrange - Crear organización
      const org = await repository.save({
        name: 'Organization',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'org@test.com',
        isActive: true,
      })

      // Crear 3 usuarios activos
      await userRepository.save({
        names: 'User 1',
        lastNames: 'Active',
        email: 'user1@test.com',
        username: 'user1',
        ci: '11111111',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      await userRepository.save({
        names: 'User 2',
        lastNames: 'Active',
        email: 'user2@test.com',
        username: 'user2',
        ci: '22222222',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      await userRepository.save({
        names: 'User 3',
        lastNames: 'Active',
        email: 'user3@test.com',
        username: 'user3',
        ci: '33333333',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      // Crear 2 usuarios inactivos
      await userRepository.save({
        names: 'User 4',
        lastNames: 'Inactive',
        email: 'user4@test.com',
        username: 'user4',
        ci: '44444444',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.INACTIVE, // ❌ Inactivo
        roles: [Role.USUARIO],
      })

      await userRepository.save({
        names: 'User 5',
        lastNames: 'Suspended',
        email: 'user5@test.com',
        username: 'user5',
        ci: '55555555',
        password: 'hash',
        organizationId: org.id,
        status: UserStatus.SUSPENDED, // ❌ Suspendido
        roles: [Role.USUARIO],
      })

      // Act - ✅ Ejecuta QueryBuilder REAL con leftJoin
      const count = await repository.countActiveUsers(org.id)

      // Assert - ✅ Verifica que el join y el filtro funcionan
      expect(count).toBe(3) // Solo los activos
    })

    it('should return 0 when organization has no users', async () => {
      // Arrange - Organización sin usuarios
      const org = await repository.save({
        name: 'Empty Org',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'empty@test.com',
        isActive: true,
      })

      // Act
      const count = await repository.countActiveUsers(org.id)

      // Assert
      expect(count).toBe(0)
    })

    it('should return 0 when organization not found', async () => {
      // Act
      const count = await repository.countActiveUsers('nonexistent-id')

      // Assert
      expect(count).toBe(0)
    })

    it('should not count users from other organizations', async () => {
      // Arrange - Dos organizaciones
      const org1 = await repository.save({
        name: 'Org 1',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'org1@test.com',
        isActive: true,
      })

      const org2 = await repository.save({
        name: 'Org 2',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71234568',
        email: 'org2@test.com',
        isActive: true,
      })

      // Usuarios de org1
      await userRepository.save({
        names: 'User Org1',
        lastNames: 'Test',
        email: 'user1@test.com',
        username: 'userorg1',
        ci: '11111111',
        password: 'hash',
        organizationId: org1.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      // Usuarios de org2
      await userRepository.save({
        names: 'User Org2',
        lastNames: 'Test',
        email: 'user2@test.com',
        username: 'userorg2',
        ci: '22222222',
        password: 'hash',
        organizationId: org2.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      await userRepository.save({
        names: 'User Org2 2',
        lastNames: 'Test',
        email: 'user3@test.com',
        username: 'userorg22',
        ci: '33333333',
        password: 'hash',
        organizationId: org2.id,
        status: UserStatus.ACTIVE,
        roles: [Role.USUARIO],
      })

      // Act - Contar usuarios de org1
      const count = await repository.countActiveUsers(org1.id)

      // Assert - Solo 1, no cuenta los de org2
      expect(count).toBe(1)
    })
  })

  describe('hardDelete', () => {
    it('should permanently delete organization', async () => {
      // Arrange
      const org = await repository.save({
        name: 'To Delete',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'delete@test.com',
        isActive: true,
      })

      // Act
      await repository.hardDelete(org.id)

      // Assert - Ya no existe en DB
      const found = await repository.findById(org.id)
      expect(found).toBeNull()
    })

    it('should not affect other organizations', async () => {
      // Arrange
      const org1 = await repository.save({
        name: 'Org 1',
        nit: '1111111111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'org1@test.com',
        isActive: true,
      })

      const org2 = await repository.save({
        name: 'Org 2',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71234568',
        email: 'org2@test.com',
        isActive: true,
      })

      // Act - Eliminar org1
      await repository.hardDelete(org1.id)

      // Assert - org2 sigue existiendo
      const foundOrg1 = await repository.findById(org1.id)
      const foundOrg2 = await repository.findById(org2.id)

      expect(foundOrg1).toBeNull()
      expect(foundOrg2).toBeDefined()
      expect(foundOrg2!.id).toBe(org2.id)
    })
  })

  describe('Integration: Multiple operations', () => {
    it('should handle create, find, update, delete cycle', async () => {
      // 1. Create
      const created = await repository.save({
        name: 'Test Org',
        nit: '1234567890',
        description: 'Original',
        address: 'Test',
        phone: '71234567',
        email: 'test@test.com',
        isActive: true,
      })

      expect(created.id).toBeDefined()

      // 2. Find
      const found = await repository.findByNit('1234567890')
      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)

      // 3. Update
      const updated = await repository.save({
        ...found,
        description: 'Updated',
      })
      expect(updated.description).toBe('Updated')

      // 4. Verify update
      const foundAgain = await repository.findById(created.id)
      expect(foundAgain!.description).toBe('Updated')

      // 5. Delete
      await repository.hardDelete(created.id)

      // 6. Verify deletion
      const afterDelete = await repository.findById(created.id)
      expect(afterDelete).toBeNull()
    })
  })
})
