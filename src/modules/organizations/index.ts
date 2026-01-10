/**
 * API Pública del módulo Organizations
 *
 * ✅ EXPONER: Module, Entity, DTOs, Service, Exceptions
 * ❌ NO EXPONER: Repository, Factory, Validator, Controller
 */

// 1. Module (SIEMPRE - para importar en AppModule)
export * from './organizations.module'

// 2. Entity (para tipos en otros módulos - ej: users tiene relación)
export * from './entities/organization.entity'

// 3. DTOs (si otros módulos los usan)
export * from './dtos'

// 4. Service (si otros módulos lo necesitan)
export * from './services/organizations.service'

// 5. Exceptions (para manejo de errores en otros módulos)
export * from './exceptions'

// 6. Repository Token & Interface (para DI en otros módulos - NO implementación)
export { ORGANIZATION_REPOSITORY } from './repositories'
export type { IOrganizationRepository, OrganizationFilters } from './repositories'

// ❌ NO exportar:
// - Repository implementation (implementación privada del módulo)
// - Factory (implementación privada del módulo)
// - Validator (implementación privada del módulo)
// - Controller (NestJS lo maneja automáticamente)
