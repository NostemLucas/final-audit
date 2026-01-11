/**
 * Repositories barrel
 *
 * ✅ Exportar: Interface
 * ❌ NO exportar: Token (now defined in ../index.ts to avoid circular imports), Implementation
 *
 * IMPORTANTE: Para importar ORGANIZATION_REPOSITORY, usar:
 * - Desde otros módulos: import { ORGANIZATION_REPOSITORY } from '../organizations'
 * - Desde este módulo: import { ORGANIZATION_REPOSITORY } from '../index'
 */

// Interface (para typing en otros módulos)
export * from './organization-repository.interface'

// ❌ NO exportar:
// - ORGANIZATION_REPOSITORY token (definido en ../index.ts)
// - OrganizationRepository class (privada, solo se usa en organizations.module.ts como provider)
