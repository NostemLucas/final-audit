// Exports internos del módulo - NO exponer en index.ts raíz
export * from './organization.repository'
export * from './organization-repository.interface'

// Symbol token para Dependency Injection
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository')
