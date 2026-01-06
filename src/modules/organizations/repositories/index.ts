// Exports internos del módulo - NO exponer en index.ts raíz
export * from './organization.repository'
export * from './origanization-repository.interface'

// Symbol token para Dependency Injection
export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository')