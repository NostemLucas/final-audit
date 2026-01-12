import { SetMetadata } from '@nestjs/common'

export const PERMISSION_KEY = 'permission'

/**
 * Interfaz para definir un permiso requerido
 */
export interface PermissionRequirement {
  /**
   * Recurso a verificar (puede contener parámetros como :id)
   * Ejemplo: '/api/users/:id', '/admin/audits'
   */
  resource: string

  /**
   * Acción requerida
   * Backend: 'GET', 'POST', 'PATCH', 'DELETE'
   * Frontend: 'read', 'create', 'update', 'delete'
   */
  action: string
}

/**
 * Decorator @RequirePermission()
 *
 * Marca un endpoint como protegido por permisos de Casbin
 * Se usa en conjunto con el PermissionsGuard
 *
 * @param resource - Recurso (ruta o endpoint)
 * @param action - Acción requerida
 *
 * @example
 * ```typescript
 * @Get()
 * @RequirePermission('/api/users', 'GET')
 * async findAll() {
 *   return await this.usersService.findAll()
 * }
 *
 * @Patch(':id')
 * @RequirePermission('/api/users/:id', 'PATCH')
 * async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
 *   return await this.usersService.update(id, dto)
 * }
 * ```
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action } as PermissionRequirement)
