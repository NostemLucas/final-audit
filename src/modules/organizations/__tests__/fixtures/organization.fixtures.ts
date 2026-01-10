import { OrganizationEntity } from '../../entities/organization.entity'

/**
 * ✅ TEST FIXTURES - Datos de prueba reutilizables para Organizations
 *
 * Ventajas:
 * - Datos consistentes en todos los tests
 * - Fácil de mantener (cambias en un lugar)
 * - Builder pattern para crear variaciones
 */

/**
 * Organizaciones predefinidas para tests
 */
export const TEST_ORGANIZATIONS = {
  /**
   * Organización principal - Activa con todos los campos
   */
  ORG_1: {
    id: 'org-1',
    name: 'Empresa de Auditoría Principal',
    nit: '1234567890',
    description: 'Empresa líder en auditoría',
    address: 'Av. Principal 123',
    phone: '71234567',
    email: 'contacto@principal.com',
    logoUrl: 'organizations/logos/org-1.png',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: undefined,
  } as OrganizationEntity,

  /**
   * Organización secundaria - Activa, sin logo
   */
  ORG_2: {
    id: 'org-2',
    name: 'Consultora ABC',
    nit: '9876543210',
    description: 'Consultoría especializada',
    address: 'Calle Test 456',
    phone: '79876543',
    email: 'info@consultoraabc.com',
    logoUrl: null,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    deletedAt: undefined,
  } as OrganizationEntity,

  /**
   * Organización inactiva
   */
  INACTIVE_ORG: {
    id: 'org-inactive',
    name: 'Organización Suspendida',
    nit: '5555555555',
    description: 'Organización temporalmente inactiva',
    address: 'Zona Sur 789',
    phone: '75555555',
    email: 'suspended@org.com',
    logoUrl: null,
    isActive: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
    deletedAt: undefined,
  } as OrganizationEntity,

  /**
   * Organización con campos mínimos
   */
  MINIMAL_ORG: {
    id: 'org-minimal',
    name: 'Organización Mínima',
    nit: '1111111111',
    description: null,
    address: null,
    phone: null,
    email: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    deletedAt: undefined,
  } as OrganizationEntity,
}

/**
 * Builder para crear organizaciones de prueba con variaciones
 *
 * Ejemplo:
 * ```typescript
 * const org = new OrganizationBuilder()
 *   .withName('Mi Empresa')
 *   .withNit('123456789')
 *   .inactive()
 *   .build()
 * ```
 */
export class OrganizationBuilder {
  private organization: Partial<OrganizationEntity> = {
    name: 'Test Organization',
    nit: '1234567890',
    description: 'Test description',
    address: 'Test address',
    phone: '71234567',
    email: 'test@test.com',
    logoUrl: null,
    isActive: true,
  }

  withId(id: string): this {
    this.organization.id = id
    return this
  }

  withName(name: string): this {
    this.organization.name = name
    return this
  }

  withNit(nit: string): this {
    this.organization.nit = nit
    return this
  }

  withDescription(description: string | null): this {
    this.organization.description = description
    return this
  }

  withAddress(address: string | null): this {
    this.organization.address = address
    return this
  }

  withPhone(phone: string | null): this {
    this.organization.phone = phone
    return this
  }

  withEmail(email: string | null): this {
    this.organization.email = email
    return this
  }

  withLogo(logoUrl: string | null): this {
    this.organization.logoUrl = logoUrl
    return this
  }

  /**
   * Marca la organización como activa
   */
  active(): this {
    this.organization.isActive = true
    return this
  }

  /**
   * Marca la organización como inactiva
   */
  inactive(): this {
    this.organization.isActive = false
    return this
  }

  /**
   * Organización sin campos opcionales
   */
  minimal(): this {
    this.organization.description = null
    this.organization.address = null
    this.organization.phone = null
    this.organization.email = null
    this.organization.logoUrl = null
    return this
  }

  /**
   * Organización completa con todos los campos
   */
  complete(): this {
    this.organization.description = 'Complete organization'
    this.organization.address = 'Complete address'
    this.organization.phone = '71111111'
    this.organization.email = 'complete@org.com'
    this.organization.logoUrl = 'organizations/logos/complete.png'
    return this
  }

  build(): OrganizationEntity {
    return {
      ...this.organization,
      createdAt: this.organization.createdAt || new Date(),
      updatedAt: this.organization.updatedAt || new Date(),
      deletedAt: this.organization.deletedAt || undefined,
    } as OrganizationEntity
  }
}

/**
 * Helper para crear una organización rápidamente
 *
 * Ejemplo:
 * ```typescript
 * const org = createTestOrganization({ name: 'Mi Empresa' })
 * ```
 */
export function createTestOrganization(
  overrides?: Partial<OrganizationEntity>,
): OrganizationEntity {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    nit: '1234567890',
    description: 'Test description',
    address: 'Test address',
    phone: '71234567',
    email: 'test@test.com',
    logoUrl: null,
    isActive: true,
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...overrides,
  }
}

/**
 * Helper para crear múltiples organizaciones con NITs únicos
 *
 * Ejemplo:
 * ```typescript
 * const orgs = createMultipleOrganizations(5)
 * // Crea 5 organizaciones con NITs diferentes
 * ```
 */
export function createMultipleOrganizations(
  count: number,
  prefix = 'org',
): OrganizationEntity[] {
  return Array.from({ length: count }, (_, index) => {
    const num = index + 1
    return createTestOrganization({
      id: `${prefix}-${num}`,
      name: `Organization ${num}`,
      nit: `${1000000000 + num}`,
      email: `org${num}@test.com`,
    })
  })
}
