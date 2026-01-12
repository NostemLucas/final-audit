import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CasbinRule } from './entities/casbin-rule.entity'
import { AuthorizationService } from './services/authorization.service'
import { PermissionsGuard } from './guards/permissions.guard'

/**
 * Authorization Module
 *
 * Módulo de autorización usando Casbin para RBAC
 *
 * Características:
 * - RBAC basado en roles del usuario
 * - Permisos almacenados en BD (tabla casbin_rule)
 * - Verificación automática con @RequirePermission decorator
 * - Soporte para rutas frontend y endpoints backend
 * - Parámetros dinámicos en recursos (:id, :slug, etc.)
 *
 * @example
 * ```typescript
 * // Proteger un endpoint con permisos
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @RequirePermission('/api/users', 'GET')
 *   async findAll() {
 *     return await this.usersService.findAll()
 *   }
 *
 *   @Patch(':id')
 *   @RequirePermission('/api/users/:id', 'PATCH')
 *   async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
 *     return await this.usersService.update(id, dto)
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [
    // Registrar entidad de Casbin
    TypeOrmModule.forFeature([CasbinRule]),
  ],
  providers: [
    // Service
    AuthorizationService,

    // Guard (debe registrarse como provider para poder inyectarlo manualmente)
    PermissionsGuard,

    // NOTA: El guard NO se registra globalmente aquí con APP_GUARD
    // porque necesita ejecutarse DESPUÉS de JwtAuthGuard.
    // Se registra en AppModule con el orden correcto.
  ],
  exports: [
    // Exportar service para uso en otros módulos
    AuthorizationService,

    // Exportar guard para registro en AppModule
    PermissionsGuard,
  ],
})
export class AuthorizationModule {}
