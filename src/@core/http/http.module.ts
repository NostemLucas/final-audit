import { Global, Module } from '@nestjs/common'
import { CookieService } from './services/cookie.service'

/**
 * Módulo global HTTP
 *
 * Proporciona servicios HTTP reutilizables en toda la aplicación:
 * - CookieService: Manejo centralizado de cookies HTTP-only
 *
 * Este módulo es @Global, por lo que sus servicios están
 * disponibles sin necesidad de importarlo explícitamente
 */
@Global()
@Module({
  providers: [CookieService],
  exports: [CookieService],
})
export class HttpModule {}
