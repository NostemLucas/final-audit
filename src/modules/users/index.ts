/**
 * API Pública del módulo Users
 *
 * ✅ EXPONER: Module, Entity, DTOs, Service, Exceptions
 * ❌ NO EXPONER: Repository, Factory, Validator, Controller
 */

// 1. Module (SIEMPRE - para importar en AppModule)
export * from './users.module'

// 2. Entity (para tipos en otros módulos)
export * from './entities/user.entity'

// 3. DTOs (si otros módulos los usan - ej: auth module)
export * from './dtos'

// 4. Service (si otros módulos lo necesitan - ej: auth module)
export * from './services/users.service'

// 5. Exceptions (para manejo de errores en otros módulos)
export * from './exceptions'

// ❌ NO exportar:
// - Repository (implementación privada del módulo)
// - Factory (implementación privada del módulo)
// - Validator (implementación privada del módulo)
// - Controller (NestJS lo maneja automáticamente)
