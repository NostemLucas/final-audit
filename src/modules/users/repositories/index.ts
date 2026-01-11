/**
 * Repositories barrel
 *
 * ✅ Exportar: Interface
 * ❌ NO exportar: Token (now defined in ../index.ts to avoid circular imports), Implementation
 *
 * IMPORTANTE: Para importar USERS_REPOSITORY, usar:
 * - Desde otros módulos: import { USERS_REPOSITORY } from '../users'
 * - Desde este módulo: import { USERS_REPOSITORY } from '../index'
 */

// Interface (para typing en otros módulos)
export * from './users-repository.interface'

// ❌ NO exportar:
// - USERS_REPOSITORY token (definido en ../index.ts)
// - UsersRepository class (privada, solo se usa en users.module.ts como provider)
