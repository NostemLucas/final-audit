import { UserEntity, UserStatus, Role } from '../../entities/user.entity'
import * as bcrypt from 'bcrypt'

/**
 * ✅ TEST FIXTURES - Datos de prueba reutilizables
 *
 * Ventajas:
 * - Datos consistentes en todos los tests
 * - Fácil de mantener (cambias en un lugar)
 * - Builder pattern para crear variaciones
 */

/**
 * Usuarios predefinidos para tests
 */
export const TEST_USERS = {
  ADMIN: {
    id: 'user-admin',
    names: 'Admin',
    lastNames: 'User',
    email: 'admin@test.com',
    username: 'admin',
    ci: '11111111',
    password: bcrypt.hashSync('AdminPass123!', 10),
    phone: '71111111',
    address: 'Admin Address',
    organizationId: 'org-1',
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: undefined,
  } as UserEntity,

  AUDITOR: {
    id: 'user-auditor',
    names: 'Juan Carlos',
    lastNames: 'Pérez López',
    email: 'juan@test.com',
    username: 'juanperez',
    ci: '12345678',
    password: bcrypt.hashSync('SecurePass123!', 10),
    phone: '71234567',
    address: 'Calle Test 123',
    organizationId: 'org-1',
    roles: [Role.AUDITOR],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: undefined,
  } as UserEntity,

  USUARIO: {
    id: 'user-usuario',
    names: 'María',
    lastNames: 'García',
    email: 'maria@test.com',
    username: 'mariagarcia',
    ci: '87654321',
    password: bcrypt.hashSync('UserPass123!', 10),
    phone: '79876543',
    address: 'Av. Test 456',
    organizationId: 'org-2',
    roles: [Role.USUARIO],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    deletedAt: undefined,
  } as UserEntity,

  INACTIVE: {
    id: 'user-inactive',
    names: 'Inactive',
    lastNames: 'User',
    email: 'inactive@test.com',
    username: 'inactiveuser',
    ci: '99999999',
    password: bcrypt.hashSync('InactivePass123!', 10),
    phone: null,
    address: null,
    organizationId: 'org-1', // ✅ Ahora es requerido
    roles: [Role.USUARIO],
    status: UserStatus.INACTIVE,
    image: null,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
    deletedAt: undefined,
  } as UserEntity,
}

/**
 * Builder para crear usuarios de prueba con variaciones
 */
export class UserBuilder {
  private user: Partial<UserEntity> = {
    names: 'Test',
    lastNames: 'User',
    email: 'test@test.com',
    username: 'testuser',
    ci: '12345678',
    password: bcrypt.hashSync('TestPass123!', 10),
    organizationId: 'default-org-id', // ✅ organizationId requerido
    roles: [Role.USUARIO],
    status: UserStatus.ACTIVE,
    image: null,
  }

  withId(id: string): this {
    this.user.id = id
    return this
  }

  withNames(names: string): this {
    this.user.names = names
    return this
  }

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  withUsername(username: string): this {
    this.user.username = username
    return this
  }

  withCI(ci: string): this {
    this.user.ci = ci
    return this
  }

  withPassword(plainPassword: string): this {
    this.user.password = bcrypt.hashSync(plainPassword, 10)
    return this
  }

  withRoles(roles: Role[]): this {
    this.user.roles = roles
    return this
  }

  withStatus(status: UserStatus): this {
    this.user.status = status
    return this
  }

  withOrganization(organizationId: string): this {
    this.user.organizationId = organizationId
    return this
  }

  inactive(): this {
    this.user.status = UserStatus.INACTIVE
    return this
  }

  admin(): this {
    this.user.roles = [Role.ADMIN]
    return this
  }

  auditor(): this {
    this.user.roles = [Role.AUDITOR]
    return this
  }

  build(): UserEntity {
    return {
      ...this.user,
      createdAt: this.user.createdAt || new Date(),
      updatedAt: this.user.updatedAt || new Date(),
      deletedAt: this.user.deletedAt || undefined,
    } as UserEntity
  }
}

/**
 * Helper para crear un usuario rápidamente
 */
export function createTestUser(overrides?: Partial<UserEntity>): UserEntity {
  return {
    id: 'test-user-id',
    names: 'Test',
    lastNames: 'User',
    email: 'test@test.com',
    username: 'testuser',
    ci: '12345678',
    password: bcrypt.hashSync('TestPass123!', 10),
    phone: null,
    address: null,
    organizationId: 'test-org-id', // ✅ organizationId requerido
    roles: [Role.USUARIO],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...overrides,
  } as UserEntity
}
