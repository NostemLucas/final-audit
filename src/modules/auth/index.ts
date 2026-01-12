/**
 * Auth module public API
 *
 * Exporta solo lo necesario para otros módulos:
 * - Guards para protección manual de rutas
 * - Decorators para configuración de rutas
 * - Interfaces para tipado
 * - Exceptions para manejo de errores
 * - Module para importar en AppModule
 *
 * NO exporta:
 * - Strategies (uso interno de Passport)
 * - Use cases (lógica de negocio interna)
 * - Services (uso interno del módulo)
 * - Controllers (registrados automáticamente)
 */

// Module
export * from './auth.module'

// Guards
export * from './guards'

// Decorators
export * from './decorators'

// Interfaces
export * from './interfaces'

// Exceptions
export * from './exceptions'

// DTOs (para documentación Swagger)
export * from './dtos'
