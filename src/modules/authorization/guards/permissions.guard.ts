import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { PATH_METADATA } from '@nestjs/common/constants'
import { AuthorizationService } from '../services/authorization.service'
import {
  PERMISSION_KEY,
  PermissionRequirement,
} from '../decorators/require-permission.decorator'
import { CHECK_PERMISSIONS_KEY } from '../decorators/check-permissions.decorator'
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator'
import type { JwtPayload } from '../../auth/interfaces'

/**
 * Permissions Guard
 *
 * Guard que verifica permisos usando Casbin
 * Debe ejecutarse DESPUÉS de JwtAuthGuard (para tener req.user)
 *
 * Soporta DOS modos de operación:
 *
 * 1. **EXPLÍCITO** con @RequirePermission('/ruta', 'accion'):
 *    - Especificas manualmente la ruta y acción
 *    - Útil cuando la ruta no coincide exactamente con el seeder
 *
 * 2. **AUTOMÁTICO** con @CheckPermissions():
 *    - Detecta automáticamente la ruta del endpoint
 *    - Detecta el método HTTP (GET, POST, etc.)
 *    - La ruta DEBE coincidir con el seeder
 *
 * @example
 * ```typescript
 * // Modo EXPLÍCITO
 * @Get()
 * @RequirePermission('/api/users', 'GET')
 * async findAll() { }
 *
 * // Modo AUTOMÁTICO (recomendado)
 * @Get()
 * @CheckPermissions()
 * async findAll() { }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Verificar si la ruta es pública (skip permissions)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    // 2. Verificar si tiene @CheckPermissions (automático)
    const checkPermissions = this.reflector.getAllAndOverride<boolean>(
      CHECK_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )

    // 3. Verificar si tiene @RequirePermission (explícito)
    const permissionReq =
      this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ])

    // Si no tiene ningún decorador de permisos, permitir acceso
    if (!checkPermissions && !permissionReq) {
      return true
    }

    // 4. Obtener usuario autenticado del request
    const request = context.switchToHttp().getRequest<Request>()
    const user = request.user

    if (!user || !user.roles) {
      throw new ForbiddenException('Usuario no autenticado o sin roles')
    }

    // 5. Determinar recurso y acción
    let resource: string
    let action: string

    if (checkPermissions) {
      // MODO AUTOMÁTICO: detectar ruta y método
      const detectedRoute = this.detectRoute(context)
      resource = detectedRoute.path
      action = detectedRoute.method
    } else {
      // MODO EXPLÍCITO: usar valores del decorator
      resource = this.replaceResourceParams(
        permissionReq.resource,
        request.params,
      )
      action = permissionReq.action
    }

    // 6. Verificar permiso con Casbin
    const hasPermission = await this.authorizationService.checkPermission(
      user.roles,
      resource,
      action,
    )

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tiene permisos para ${action} en ${resource}`,
      )
    }

    return true
  }

  /**
   * Detecta automáticamente la ruta y método HTTP del endpoint
   *
   * @param context - Contexto de ejecución
   * @returns Objeto con path y method
   *
   * @example
   * // Controller: @Controller('users')
   * // Method: @Get(':id')
   * // Resultado: { path: '/api/users/:id', method: 'GET' }
   */
  private detectRoute(context: ExecutionContext): {
    path: string
    method: string
  } {
    const request = context.switchToHttp().getRequest<Request>()

    // Obtener método HTTP (GET, POST, PATCH, DELETE)
    const method: string = request.method

    // Obtener path del controller
    const controllerPath: string =
      this.reflector.get<string>(PATH_METADATA, context.getClass()) || ''

    // Obtener path del método
    const handlerPath: string =
      this.reflector.get<string>(PATH_METADATA, context.getHandler()) || ''

    // Construir ruta completa
    // Ejemplo: /api + /users + /:id = /api/users/:id
    let fullPath = '/api'
    if (controllerPath) {
      fullPath += `/${controllerPath.replace(/^\//, '')}`
    }
    if (handlerPath) {
      fullPath += `/${handlerPath.replace(/^\//, '')}`
    }

    // Limpiar dobles barras
    fullPath = fullPath.replace(/\/+/g, '/')

    return {
      path: fullPath,
      method,
    }
  }

  /**
   * Reemplaza parámetros dinámicos en el recurso
   *
   * @param resource - Recurso con parámetros (ej: /api/users/:id)
   * @param params - Parámetros del request
   * @returns Recurso con valores reales (ej: /api/users/123)
   *
   * @example
   * replaceResourceParams('/api/users/:id', { id: '123' })
   * // returns '/api/users/123'
   */
  private replaceResourceParams(
    resource: string,
    params: Record<string, string>,
  ): string {
    let result = resource

    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, value)
    }

    return result
  }
}
