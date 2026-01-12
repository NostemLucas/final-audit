import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * JWT Auth Guard
 *
 * Guard global que protege todas las rutas por defecto
 * Para marcar una ruta como pública, usar el decorador @Public()
 *
 * Este guard:
 * - Se aplica globalmente (APP_GUARD en AuthModule)
 * - Verifica la presencia de un access token válido
 * - Permite bypass con @Public()
 *
 * @see JwtStrategy - Estrategia que valida el token
 * @see Public - Decorator para marcar rutas públicas
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  /**
   * Determina si se puede activar la ruta
   *
   * Si la ruta tiene @Public(), permite el acceso sin autenticación
   * De lo contrario, delega a la estrategia JWT para validar el token
   *
   * @param context - Contexto de ejecución de NestJS
   * @returns true si se puede acceder, false si no
   */
  canActivate(context: ExecutionContext) {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true // Skip autenticación
    }

    // Delegar a la estrategia JWT
    return super.canActivate(context)
  }
}
