import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request } from 'express'
import { AuditService } from '@core/database/audit.service'

/**
 * Interceptor que captura el usuario autenticado de la petición HTTP
 * y lo almacena en CLS para auditoría automática
 *
 * Extrae el usuario del contexto de la petición (añadido por JwtAuthGuard)
 * y lo guarda en CLS usando AuditService.
 *
 * Los repositorios usarán automáticamente este usuario para llenar
 * createdBy y updatedBy en las entidades.
 *
 * @example
 * ```typescript
 * // Registrar globalmente en AppModule
 * {
 *   provide: APP_INTERCEPTOR,
 *   useClass: AuditInterceptor,
 * }
 * ```
 *
 * Orden de ejecución recomendado:
 * 1. JwtAuthGuard: Valida token y añade user a request
 * 2. AuditInterceptor: Lee user de request y lo guarda en CLS
 * 3. Controller: Ejecuta lógica de negocio
 * 4. Repository: Lee user de CLS y aplica auditoría
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Solo procesar peticiones HTTP
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<Request>()

      // El usuario es añadido por JwtAuthGuard en request.user
      // Estructura típica: { sub: 'userId', email: 'user@example.com', ... }
      const user = request.user

      if (user?.sub) {
        // Guardar userId en CLS para que esté disponible en toda la petición
        this.auditService.setCurrentUserId(user.sub)
      }
    }

    return next.handle()
  }
}
