import { Module, Global } from '@nestjs/common'
import { PasswordHashService } from './services'

/**
 * Security Module
 *
 * Módulo global que proporciona servicios de seguridad reutilizables
 * como hashing de passwords, encriptación, etc.
 *
 * Al ser @Global(), sus providers están disponibles en toda la aplicación
 * sin necesidad de importar el módulo explícitamente
 */
@Global()
@Module({
  providers: [PasswordHashService],
  exports: [PasswordHashService],
})
export class SecurityModule {}
