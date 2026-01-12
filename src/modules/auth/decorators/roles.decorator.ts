import { SetMetadata } from '@nestjs/common'
import { Role } from '../../users/entities/user.entity'

/**
 * Key para identificar roles requeridos
 */
export const ROLES_KEY = 'roles'

/**
 * Decorator @Roles()
 *
 * Especifica qué roles pueden acceder a una ruta
 * El usuario debe tener al menos uno de los roles especificados
 *
 * @param roles - Roles permitidos
 *
 * @example
 * ```typescript
 * @Roles(Role.ADMIN)
 * @Post('users')
 * async createUser(@Body() dto: CreateUserDto) {
 *   // Solo admins pueden acceder
 * }
 *
 * @Roles(Role.ADMIN, Role.GERENTE)
 * @Get('reports')
 * async getReports() {
 *   // Admins o gerentes pueden acceder
 * }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
