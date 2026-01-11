/**
 * API Pública del módulo Users
 *
 * REGLAS:
 * ✅ SÍ exportar: Module, Service (si se usa fuera), Exceptions, Repository Token/Interface
 * ❌ NO exportar: Entity (import directo para evitar circular deps), DTOs (internos), Implementations
 *
 * IMPORTANTE:
 * - Entity: NO exportar aquí. Usar import directo: '../users/entities/user.entity'
 * - Esto evita circular dependencies cuando otros módulos usan la entidad
 */

// 1. Module (para importar en AppModule)
export * from './users.module'

// 2. Service (si otros módulos lo necesitan - ej: auth module)
export * from './services/users.service'

// 3. Exceptions (para manejo de errores en otros módulos)
export * from './exceptions'

// 4. Repository Token & Interface (para DI en otros módulos - NO implementación)
// Token defined in tokens.ts and re-exported here
export { USERS_REPOSITORY } from './tokens'
export type { IUsersRepository } from './repositories'

// ❌ NO exportar aquí (usar imports directos):
// - Entity → import { UserEntity } from '../users/entities/user.entity'
// - DTOs (privados del módulo, solo se usan internamente)
// - Repository implementation (implementación privada)
// - Factory (implementación privada)
// - Validator (implementación privada)
// - Use Cases (privados, llamados desde service)
// - Controller (NestJS lo maneja automáticamente)
