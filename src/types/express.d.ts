import type { JwtPayload } from '../modules/auth/interfaces'

/**
 * Extensión de tipos de Express para incluir usuario autenticado
 *
 * Este archivo extiende el namespace de Express para agregar la propiedad `user`
 * al objeto `Request`, la cual es añadida por JwtAuthGuard después de validar el JWT.
 *
 * Esto elimina los errores de TypeScript al acceder a `request.user` en guards,
 * interceptors, controllers y decoradores.
 *
 * @example
 * ```typescript
 * // En un controller o interceptor
 * const request = context.switchToHttp().getRequest()
 * const userId = request.user.sub // ✅ TypeScript conoce el tipo
 * ```
 */
declare module 'express-serve-static-core' {
  /**
   * Extensión de Request para incluir el payload JWT
   */
  interface Request {
    /**
     * Usuario autenticado extraído del JWT
     * Añadido por JwtAuthGuard cuando el token es válido
     * Undefined en rutas públicas o cuando no hay token
     */
    user?: JwtPayload
  }
}

// Este export vacío es necesario para que TypeScript trate este archivo como un módulo
export {}
