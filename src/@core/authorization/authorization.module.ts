import { Module, Global } from '@nestjs/common'
import { RolesGuard } from './guards'

/**
 * Authorization Module
 *
 * Módulo global que proporciona funcionalidad de autorización (RBAC)
 * independiente del dominio
 *
 * Incluye:
 * - RolesGuard: Guard para verificar roles de usuario
 * - @Roles() decorator: Decorator para especificar roles requeridos
 * - Type genérico Role: Tipo string para roles (sin acoplamiento a enums)
 *
 * Al ser @Global(), sus providers están disponibles en toda la aplicación
 * sin necesidad de importar el módulo explícitamente
 *
 * @example
 * ```typescript
 * // En tu controller
 * import { Roles } from '@core/authorization'
 *
 * @Roles('admin', 'editor')
 * @Get('users')
 * async getUsers() {
 *   // Solo accesible por admin o editor
 * }
 * ```
 */
@Global()
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class AuthorizationModule {}
