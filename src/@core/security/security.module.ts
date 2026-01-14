import { Module, Global } from '@nestjs/common'
import { PasswordHashService, RateLimitService } from './services'

/**
 * Security Module
 *
 * Módulo global que proporciona servicios de seguridad reutilizables:
 * - PasswordHashService: Hashing de contraseñas con bcrypt
 * - RateLimitService: Rate limiting para prevenir fuerza bruta
 *
 * Al ser @Global(), sus providers están disponibles en toda la aplicación
 * sin necesidad de importar el módulo explícitamente
 */
@Global()
@Module({
  providers: [PasswordHashService, RateLimitService],
  exports: [PasswordHashService, RateLimitService],
})
export class SecurityModule {}
