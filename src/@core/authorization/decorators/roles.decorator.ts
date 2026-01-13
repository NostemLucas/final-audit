import { SetMetadata } from '@nestjs/common'
import type { Role } from '../types'

/**
 * Key para identificar roles requeridos en metadata
 */
export const ROLES_KEY = 'roles'

/**
 * Decorator @Roles()
 *
 * Especifica qué roles pueden acceder a una ruta o controller
 * El usuario debe tener al menos uno de los roles especificados
 *
 * Este decorator trabaja en conjunto con RolesGuard
 *
 * @param roles - Roles permitidos (strings o valores de enum)
 *
 * @example
 * ```typescript
 * // Uso con strings
 * @Roles('admin', 'editor')
 * @Post('users')
 * async createUser(@Body() dto: CreateUserDto) {
 *   // Solo admins o editors pueden acceder
 * }
 *
 * // Uso con enum (si tu dominio define uno)
 * import { UserRole } from '@modules/users/entities/user.entity'
 *
 * @Roles(UserRole.ADMIN, UserRole.GERENTE)
 * @Get('reports')
 * async getReports() {
 *   // Admins o gerentes pueden acceder
 * }
 *
 * // Aplicar a nivel de controller
 * @Roles('admin')
 * @Controller('admin')
 * export class AdminController {
 *   // Todas las rutas requieren rol 'admin'
 * }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
