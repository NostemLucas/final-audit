import { UsersService } from './users.service'
import { UserValidator } from '../validators/user.validator'
import { UserFactory } from '../factories/user.factory'
import { UserStatus, Role } from '../entities/user.entity'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserNotFoundException, EmailAlreadyExistsException } from '../exceptions'
import { FilesService } from '@core/files'
import { TransactionService } from '@core/database'
import { FakeUsersRepository } from '../__tests__/fixtures/fake-users.repository'
import { TEST_USERS, UserBuilder, createTestUser } from '../__tests__/fixtures/user.fixtures'
import * as bcrypt from 'bcrypt'

/**
 * ✅ INTEGRATION TESTS - UsersService (with Fake Repository)
 *
 * Testing approach:
 * - Fake Repository: Simulates DB in memory (REAL behavior)
 * - Real Validator: Tests actual validation logic
 * - Real Factory: Tests actual normalization logic
 * - Mock TransactionService & FilesService: Only mock external dependencies
 *
 * This approach is much more reliable than mocking everything!
 */
describe('UsersService (Integration)', () => {
  let service: UsersService
  let fakeRepository: FakeUsersRepository
  let validator: UserValidator
  let factory: UserFactory
  let transactionService: jest.Mocked<TransactionService>
  let filesService: jest.Mocked<FilesService>

  beforeEach(() => {
    // ✅ Create fake repository (works like DB in memory)
    fakeRepository = new FakeUsersRepository()

    // Mock only external dependencies
    transactionService = {
      runInTransaction: jest.fn((callback) => callback()),
    } as any

    filesService = {
      replaceFile: jest.fn(),
    } as any

    // ✅ Use REAL instances of business logic
    validator = new UserValidator(fakeRepository)
    factory = new UserFactory()

    service = new UsersService(
      fakeRepository,
      validator,
      factory,
      transactionService,
      filesService,
    )
  })

  afterEach(() => {
    fakeRepository.clear() // Clean data between tests
  })

  describe('create', () => {
    it('should create user with real validation', async () => {
      // Arrange - Seed with existing data using fixtures
      fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR])

      const newUserDto: CreateUserDto = {
        names: 'Nuevo',
        lastNames: 'Usuario',
        email: 'nuevo@test.com', // Unique email
        username: 'nuevousuario',
        ci: '55555555',
        password: 'NewPass123!',
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      // Act
      const result = await service.create(newUserDto)

      // Assert - ✅ User saved REALLY in fake repo
      expect(result.id).toBeDefined()
      expect(result.email).toBe('nuevo@test.com')

      // ✅ Verify it's really in the repo
      const savedUser = await fakeRepository.findById(result.id)
      expect(savedUser).toBeDefined()
      expect(savedUser!.email).toBe('nuevo@test.com')

      // ✅ Verify total count
      expect(fakeRepository.count()).toBe(3) // 2 seeded + 1 new
    })

    it('should throw EmailAlreadyExistsException when email is duplicate', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN])

      const duplicateDto: CreateUserDto = {
        names: 'Duplicate',
        lastNames: 'User',
        email: TEST_USERS.ADMIN.email, // ❌ Duplicate email
        username: 'newusername',
        ci: '66666666',
        password: 'Pass123!',
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      // Act & Assert - ✅ Validator executes REAL search in fake repo
      await expect(service.create(duplicateDto)).rejects.toThrow(
        EmailAlreadyExistsException,
      )

      // ✅ Verify user was NOT created
      expect(fakeRepository.count()).toBe(1) // Only the seeded one
    })

    it('should work with UserBuilder for custom scenarios', async () => {
      // Arrange - Create custom user with builder
      const existingUser = new UserBuilder()
        .withEmail('existing@test.com')
        .withUsername('existinguser')
        .withCI('77777777')
        .auditor()
        .build()

      fakeRepository.seed([existingUser])

      const newUserDto: CreateUserDto = {
        names: 'New',
        lastNames: 'User',
        email: 'new@test.com',
        username: 'newuser',
        ci: '88888888',
        password: 'Pass123!',
        roles: [Role.ADMIN],
        status: UserStatus.ACTIVE,
      }

      // Act
      const result = await service.create(newUserDto)

      // Assert
      expect(result.id).toBeDefined()
      expect(fakeRepository.count()).toBe(2)

      // ✅ Can make real queries
      const allUsers = await fakeRepository.findAll()
      expect(allUsers).toHaveLength(2)

      const adminUsers = allUsers.filter((u) => u.roles.includes(Role.ADMIN))
      expect(adminUsers).toHaveLength(1)
    })
  })

  describe('update', () => {
    it('should update user with real validation', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR])

      const updateDto: UpdateUserDto = {
        names: 'Updated Admin',
        email: 'updated-admin@test.com', // New unique email
      }

      // Act
      const result = await service.update(TEST_USERS.ADMIN.id, updateDto)

      // Assert
      expect(result.names).toBe('Updated Admin')
      expect(result.email).toBe('updated-admin@test.com')

      // ✅ Verify change persisted in repo
      const updatedUser = await fakeRepository.findById(TEST_USERS.ADMIN.id)
      expect(updatedUser!.names).toBe('Updated Admin')
      expect(updatedUser!.email).toBe('updated-admin@test.com')
    })

    it('should allow updating to same email (excludeId works)', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN])

      const updateDto: UpdateUserDto = {
        email: TEST_USERS.ADMIN.email, // Same email (should allow)
        names: 'Updated Names',
      }

      // Act
      const result = await service.update(TEST_USERS.ADMIN.id, updateDto)

      // Assert - ✅ Validator REAL allows updating with same email
      expect(result.email).toBe(TEST_USERS.ADMIN.email)
      expect(result.names).toBe('Updated Names')
    })

    it('should prevent updating to email of another user', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR])

      const updateDto: UpdateUserDto = {
        email: TEST_USERS.AUDITOR.email, // ❌ Email of another user
      }

      // Act & Assert
      await expect(
        service.update(TEST_USERS.ADMIN.id, updateDto),
      ).rejects.toThrow(EmailAlreadyExistsException)
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR, TEST_USERS.USUARIO])

      // Act
      const result = await service.findByEmail(TEST_USERS.AUDITOR.email)

      // Assert
      expect(result).toBeDefined()
      expect(result!.id).toBe(TEST_USERS.AUDITOR.id)
      expect(result!.email).toBe(TEST_USERS.AUDITOR.email)
    })

    it('should return null when user not found', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN])

      // Act
      const result = await service.findByEmail('nonexistent@test.com')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByOrganization', () => {
    it('should find all users from same organization', async () => {
      // Arrange
      const org1User1 = createTestUser({
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        ci: '11111111',
        organizationId: 'org-1',
      })

      const org1User2 = createTestUser({
        id: 'user-2',
        email: 'user2@test.com',
        username: 'user2',
        ci: '22222222',
        organizationId: 'org-1',
      })

      const org2User = createTestUser({
        id: 'user-3',
        email: 'user3@test.com',
        username: 'user3',
        ci: '33333333',
        organizationId: 'org-2',
      })

      fakeRepository.seed([org1User1, org1User2, org2User])

      // Act
      const result = await service.findByOrganization('org-1')

      // Assert
      expect(result).toHaveLength(2)
      expect(result.map((u) => u.id)).toEqual(['user-1', 'user-2'])
    })
  })

  describe('remove (soft delete)', () => {
    it('should soft delete user', async () => {
      // Arrange
      fakeRepository.seed([TEST_USERS.ADMIN])

      // Act
      await service.remove(TEST_USERS.ADMIN.id)

      // Assert - ✅ User no longer appears in findById (soft deleted)
      const user = await fakeRepository.findById(TEST_USERS.ADMIN.id)
      expect(user).toBeNull()

      // ✅ But still in repo (with deletedAt)
      const allIncludingDeleted = fakeRepository.getAllIncludingDeleted()
      expect(allIncludingDeleted).toHaveLength(1)
      expect(allIncludingDeleted[0].deletedAt).toBeDefined()
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple operations on same data', async () => {
      // ✅ Complex scenario: create, update, search
      // With fake repo you don't need to mock each step

      // 1. Create user
      const createDto: CreateUserDto = {
        names: 'Test',
        lastNames: 'User',
        email: 'test@test.com',
        username: 'testuser',
        ci: '12345678',
        password: 'Pass123!',
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      const created = await service.create(createDto)
      expect(created.id).toBeDefined()

      // 2. Update
      const updateDto: UpdateUserDto = {
        names: 'Updated Test',
        status: UserStatus.INACTIVE,
      }

      const updated = await service.update(created.id, updateDto)
      expect(updated.names).toBe('Updated Test')
      expect(updated.status).toBe(UserStatus.INACTIVE)

      // 3. Search by email
      const found = await service.findByEmail('test@test.com')
      expect(found!.id).toBe(created.id)
      expect(found!.names).toBe('Updated Test')

      // 4. Verify final state
      expect(fakeRepository.count()).toBe(1)
      const all = await fakeRepository.findAll()
      expect(all[0].status).toBe(UserStatus.INACTIVE)
    })

    it('should validate password hashing works correctly', async () => {
      // Arrange
      const plainPassword = 'MySecurePass123!'
      const createDto: CreateUserDto = {
        names: 'Test',
        lastNames: 'User',
        email: 'test@test.com',
        username: 'testuser',
        ci: '12345678',
        password: plainPassword,
        roles: [Role.USUARIO],
        status: UserStatus.ACTIVE,
      }

      // Act
      const created = await service.create(createDto)

      // Assert - ✅ Password must be hashed in repo
      const saved = await fakeRepository.findById(created.id)
      expect(saved!.password).not.toBe(plainPassword)
      expect(bcrypt.compareSync(plainPassword, saved!.password)).toBe(true)

      // ✅ Verify with factory
      expect(factory.verifyPassword(plainPassword, saved!.password)).toBe(true)
      expect(factory.verifyPassword('WrongPassword', saved!.password)).toBe(false)
    })
  })
})
