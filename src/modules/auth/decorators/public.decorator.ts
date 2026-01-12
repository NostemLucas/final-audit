import { SetMetadata } from '@nestjs/common'

/**
 * Key para identificar rutas públicas
 */
export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Decorator @Public()
 *
 * Marca una ruta como pública (no requiere autenticación)
 * Bypass del JwtAuthGuard global
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('stats')
 * async getPublicStats() {
 *   return { totalUsers: 100 }
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
