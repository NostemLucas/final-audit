/**
 * Repositories barrel
 *
 * ✅ Exportar: Interface + Token (para DI en otros módulos)
 * ❌ NO exportar: Implementation (privada del módulo)
 */

// Interface (para typing en otros módulos)
export * from './users-repository.interface'

// Token (para Dependency Injection en otros módulos)
export const USERS_REPOSITORY = Symbol('IUsersRepository')

// ❌ NO exportar la implementación:
// - UsersRepository class (privada, solo se usa en users.module.ts como provider)
