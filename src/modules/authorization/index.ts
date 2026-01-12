/**
 * Authorization Module Public API
 *
 * Exporta:
 * - Module para importar en AppModule
 * - Service para verificar permisos programáticamente
 * - Guards para protección de rutas
 * - Decorators para marcar endpoints protegidos
 * - Constants (AppType, PolicyAction)
 * - Entities (CasbinRule)
 *
 * NOTA: Los seeders están en @core/database/seeds/03-permissions.seeder.ts
 */

// Module
export * from './authorization.module'

// Services
export * from './services'

// Guards
export * from './guards'

// Decorators
export * from './decorators'

// Constants
export * from './constants'

// Entities
export * from './entities'
