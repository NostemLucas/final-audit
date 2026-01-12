import { SetMetadata } from '@nestjs/common'

export const CHECK_PERMISSIONS_KEY = 'check_permissions'

/**
 * Decorator @CheckPermissions()
 *
 * Marca un endpoint para verificación AUTOMÁTICA de permisos.
 * El guard detecta automáticamente:
 * - La ruta del endpoint (ej: /api/users, /api/users/:id)
 * - El método HTTP (GET, POST, PATCH, DELETE)
 *
 * Y verifica si el usuario tiene ese permiso en Casbin.
 *
 * VENTAJAS:
 * - Menos código
 * - No repetir rutas
 * - Menos propenso a errores de tipeo
 * - DRY (Don't Repeat Yourself)
 *
 * REQUISITO:
 * - La ruta del controller + método debe coincidir EXACTAMENTE con el seeder
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   // Verifica permiso: /api/users + GET
 *   @Get()
 *   @CheckPermissions()
 *   async findAll() { }
 *
 *   // Verifica permiso: /api/users/:id + PATCH
 *   @Patch(':id')
 *   @CheckPermissions()
 *   async update(@Param('id') id: string) { }
 * }
 * ```
 */
export const CheckPermissions = () => SetMetadata(CHECK_PERMISSIONS_KEY, true)
