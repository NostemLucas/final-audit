/**
 * API Pública del módulo Organizations
 *
 * REGLAS:
 * ✅ SÍ exportar: Module, Service (si se usa fuera), Exceptions, Repository Token/Interface
 * ❌ NO exportar: Entity (import directo para evitar circular deps), DTOs (internos), Implementations
 *
 * IMPORTANTE:
 * - Entity: NO exportar aquí. Usar import directo: '../organizations/entities/organization.entity'
 * - Esto evita circular dependencies cuando otros módulos usan la entidad
 */

// 1. Module (para importar en AppModule)
export * from './organizations.module'

// 2. Service (si otros módulos lo necesitan)
export * from './services/organizations.service'

// 3. Exceptions (para manejo de errores en otros módulos)
export * from './exceptions'

// 4. Repository Token & Interface (para DI en otros módulos - NO implementación)
// Token defined in tokens.ts and re-exported here
export { ORGANIZATION_REPOSITORY } from './tokens'
export type {
  IOrganizationRepository,
  OrganizationFilters,
} from './repositories'

// ❌ NO exportar aquí (usar imports directos):
// - Entity → import { OrganizationEntity } from '../organizations/entities/organization.entity'
// - DTOs (privados del módulo, solo se usan internamente)
// - Repository implementation (implementación privada)
// - Factory (implementación privada)
// - Validator (implementación privada)
// - Use Cases (privados, llamados desde service)
// - Controller (NestJS lo maneja automáticamente)
