// Exports internos del módulo - NO exponer en index.ts raíz
export * from './users.repository'
export * from './users-repository.interface'

// Symbol token para Dependency Injection
export const USERS_REPOSITORY = Symbol('IUsersRepository')
