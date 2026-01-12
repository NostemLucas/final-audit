import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '../../users/entities/user.entity'
import type { JwtPayload } from '../interfaces'

/**
 * Roles Guard
 *
 * Guard global que verifica los roles del usuario
 * Para requerir roles específicos, usar el decorador @Roles()
 *
 * Este guard:
 * - Se aplica después de JwtAuthGuard
 * - Verifica que el usuario tenga al menos uno de los roles requeridos
 * - Permite acceso si no se especifican roles
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
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    // Obtener usuario del request (inyectado por JwtStrategy)
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>()

    if (!user || !user.roles) {
      return false
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    return requiredRoles.some((role) => user.roles.includes(role))
  }
}
