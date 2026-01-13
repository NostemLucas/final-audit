import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { Role } from '../types'

/**
 * Roles Guard
 *
 * Guard global que verifica los roles del usuario
 * Para requerir roles específicos, usar el decorador @Roles()
 *
 * Este guard:
 * - Se aplica después de JwtAuthGuard (requiere usuario autenticado)
 * - Verifica que el usuario tenga al menos uno de los roles requeridos
 * - Permite acceso si no se especifican roles (@Roles no está presente)
 * - Es independiente del dominio (no depende de enum específico de users)
 *
 * @see Roles - Decorator para especificar roles requeridos
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determina si se puede activar la ruta basado en roles
   *
   * @param context - Contexto de ejecución de NestJS
   * @returns true si el usuario tiene los roles necesarios, false si no
   */
  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos del decorador @Roles()
    // Busca en el handler (método) y en la clase (controller)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    // Obtener usuario del request (inyectado por JwtStrategy)
    // user.roles puede ser string[] o enum[], por eso convertimos a strings
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { roles?: string[] } }>()

    if (!user || !user.roles) {
      return false
    }

    // Convertir ambos arrays a strings para comparación segura
    const userRoles = user.roles.map((r) => String(r))
    const requiredRoleStrings = requiredRoles.map((r) => String(r))

    // Verificar si el usuario tiene alguno de los roles requeridos
    return requiredRoleStrings.some((role) => userRoles.includes(role))
  }
}
