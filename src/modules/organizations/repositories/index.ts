/**
 * Repositories barrel
 *
 * ✅ Exportar: Interface + Token (para DI en otros módulos)
 * ❌ NO exportar: Implementation (privada del módulo)
 */

// Interface (para typing en otros módulos)
export * from './organization-repository.interface'

// Token (para Dependency Injection en otros módulos)
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository')

// ❌ NO exportar la implementación:
// - OrganizationRepository class (privada, solo se usa en organizations.module.ts como provider)
