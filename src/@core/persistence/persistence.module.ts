import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// ========== ENTITIES ==========
import { UserEntity } from '../../modules/users/entities/user.entity'
import { OrganizationEntity } from '../../modules/organizations/entities/organization.entity'
// TODO: Importar otras entities cuando las agregues:
// import { AuditEntity } from '../../modules/audits/entities/audit.entity'
// import { TemplateEntity } from '../../modules/templates/entities/template.entity'

// ========== REPOSITORIES ==========
import { UsersRepository } from '../../modules/users/repositories/users.repository'
import { OrganizationRepository } from '../../modules/organizations/repositories/organization.repository'
// TODO: Importar otros repositorios:
// import { AuditsRepository } from '../../modules/audits/repositories/audits.repository'

// ========== TOKENS ==========
// Import tokens from module barrel files (index.ts), not repositories subdirectory
import { USERS_REPOSITORY } from '../../modules/users'
import { ORGANIZATION_REPOSITORY } from '../../modules/organizations'
// TODO: Importar otros tokens:
// import { AUDITS_REPOSITORY } from '../../modules/audits'

/**
 * Módulo de Persistencia Centralizado
 *
 * 🎯 Propósito:
 * - Eliminar dependencias circulares entre módulos
 * - Centralizar configuración de TypeORM
 * - Proveer repositorios globalmente sin re-importar
 *
 * 🔧 Es @Global() para:
 * - No tener que importar este módulo en cada feature module
 * - Los repositorios están disponibles automáticamente en toda la app
 *
 * 📝 Cómo agregar un nuevo módulo:
 * 1. Importar entity en la sección ENTITIES
 * 2. Importar repository en la sección REPOSITORIES
 * 3. Importar token en la sección TOKENS
 * 4. Agregar entity en TypeOrmModule.forFeature([...])
 * 5. Agregar provider en providers: [...]
 * 6. Agregar token en exports: [...]
 *
 * @example
 * // Agregar AuditsModule:
 *
 * // 1. Imports
 * import { AuditEntity } from '../../modules/audits/entities/audit.entity'
 * import { AuditsRepository } from '../../modules/audits/repositories/audits.repository'
 * import { AUDITS_REPOSITORY } from '../../modules/audits/repositories'
 *
 * // 2. TypeOrmModule
 * TypeOrmModule.forFeature([
 *   UserEntity,
 *   OrganizationEntity,
 *   AuditEntity, // ✅ Agregar aquí
 * ]),
 *
 * // 3. Providers
 * providers: [
 *   // ... otros
 *   {
 *     provide: AUDITS_REPOSITORY,
 *     useClass: AuditsRepository,
 *   },
 * ],
 *
 * // 4. Exports
 * exports: [
 *   USERS_REPOSITORY,
 *   ORGANIZATION_REPOSITORY,
 *   AUDITS_REPOSITORY, // ✅ Exportar aquí
 * ]
 */
@Global()
@Module({
  imports: [
    // Registrar todas las entities de la aplicación
    TypeOrmModule.forFeature([
      UserEntity,
      OrganizationEntity,
      // TODO: Agregar nuevas entities aquí
    ]),
  ],
  providers: [
    // ========== Users Repository ==========
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },

    // ========== Organizations Repository ==========
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },

    // ========== TODO: Agregar nuevos repositorios aquí ==========
    // {
    //   provide: AUDITS_REPOSITORY,
    //   useClass: AuditsRepository,
    // },
  ],
  exports: [
    // Exportar tokens para que estén disponibles globalmente
    USERS_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    // TODO: Exportar nuevos tokens aquí
  ],
})
export class PersistenceModule {}
