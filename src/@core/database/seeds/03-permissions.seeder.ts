import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { CasbinRule } from '../../../modules/authorization/entities/casbin-rule.entity'
import { Role } from '../../../modules/users/entities/user.entity'
import { AppType, PolicyAction } from '../../../modules/authorization/constants'

/**
 * Interfaz para definir un permiso
 */
interface PermissionDefinition {
  role: Role
  resource: string
  action: PolicyAction | string
  app: AppType
  module: string
  description?: string
}

/**
 * Seeder de Permisos usando Casbin
 *
 * Carga todos los permisos del sistema en la base de datos
 * Organizado por:
 * - FRONTEND: Rutas de la aplicación web
 * - BACKEND: Endpoints de la API
 *
 * Ejecutar con: npm run seed:run
 */
export default class PermissionsSeeder implements Seeder {
  /**
   * Ejecuta el seeder
   */
  public async run(dataSource: DataSource): Promise<void> {
    const permissions: PermissionDefinition[] = []

    // ==================== PERMISOS FRONTEND ====================

    // Home - Visible para todos los roles
    ;[Role.ADMIN, Role.GERENTE, Role.AUDITOR, Role.CLIENTE].forEach((role) => {
      permissions.push({
        role,
        resource: '/admin/home',
        action: PolicyAction.READ,
        app: AppType.FRONTEND,
        module: 'home',
        description: 'Ver página de inicio',
      })
    })

    // Profile - CRUD completo para todos
    ;[Role.ADMIN, Role.GERENTE, Role.AUDITOR, Role.CLIENTE].forEach((role) => {
      ;[
        PolicyAction.READ,
        PolicyAction.CREATE,
        PolicyAction.UPDATE,
        PolicyAction.DELETE,
      ].forEach((action) => {
        permissions.push({
          role,
          resource: '/admin/profile',
          action,
          app: AppType.FRONTEND,
          module: 'profile',
          description: 'Gestión de perfil propio',
        })
      })
    })

    // Users - Solo ADMIN
    ;[
      PolicyAction.READ,
      PolicyAction.CREATE,
      PolicyAction.UPDATE,
      PolicyAction.DELETE,
    ].forEach((action) => {
      permissions.push({
        role: Role.ADMIN,
        resource: '/admin/users',
        action,
        app: AppType.FRONTEND,
        module: 'users',
        description: 'Gestión de usuarios',
      })
    })

    // Templates - Solo ADMIN
    ;[
      PolicyAction.READ,
      PolicyAction.CREATE,
      PolicyAction.UPDATE,
      PolicyAction.DELETE,
    ].forEach((action) => {
      permissions.push({
        role: Role.ADMIN,
        resource: '/admin/templates',
        action,
        app: AppType.FRONTEND,
        module: 'templates',
        description: 'Gestión de plantillas',
      })
    })

    // Controls - ADMIN (CRUD) + GERENTE (read)
    ;[
      PolicyAction.READ,
      PolicyAction.CREATE,
      PolicyAction.UPDATE,
      PolicyAction.DELETE,
    ].forEach((action) => {
      permissions.push({
        role: Role.ADMIN,
        resource: '/admin/controls',
        action,
        app: AppType.FRONTEND,
        module: 'controls',
        description: 'Gestión de controles',
      })
    })
    permissions.push({
      role: Role.GERENTE,
      resource: '/admin/controls',
      action: PolicyAction.READ,
      app: AppType.FRONTEND,
      module: 'controls',
      description: 'Ver controles',
    })

    // Audits - GERENTE CRUD
    ;[
      PolicyAction.READ,
      PolicyAction.CREATE,
      PolicyAction.UPDATE,
      PolicyAction.DELETE,
    ].forEach((action) => {
      permissions.push({
        role: Role.GERENTE,
        resource: '/admin/audits',
        action,
        app: AppType.FRONTEND,
        module: 'audits',
        description: 'Gestión de auditorías',
      })
    })

    // Assessments - GERENTE (CRUD) + AUDITOR (read, update)
    ;[
      PolicyAction.READ,
      PolicyAction.CREATE,
      PolicyAction.UPDATE,
      PolicyAction.DELETE,
    ].forEach((action) => {
      permissions.push({
        role: Role.GERENTE,
        resource: '/admin/assessments',
        action,
        app: AppType.FRONTEND,
        module: 'assessments',
        description: 'Gestión de evaluaciones',
      })
    })
    ;[PolicyAction.READ, PolicyAction.UPDATE].forEach((action) => {
      permissions.push({
        role: Role.AUDITOR,
        resource: '/admin/assessments',
        action,
        app: AppType.FRONTEND,
        module: 'assessments',
        description: 'Edición de evaluaciones',
      })
    })

    // ==================== PERMISOS BACKEND ====================

    // Users endpoints
    const userPermissions: Array<{
      path: string
      roles: Role[]
      actions: string[]
    }> = [
      {
        path: '/api/users',
        roles: [Role.ADMIN, Role.GERENTE],
        actions: [PolicyAction.GET, PolicyAction.POST],
      },
      {
        path: '/api/users/:id',
        roles: [Role.ADMIN, Role.GERENTE],
        actions: [
          PolicyAction.GET,
          PolicyAction.PATCH,
          PolicyAction.HTTP_DELETE,
        ],
      },
      {
        path: '/api/users/:id',
        roles: [Role.AUDITOR, Role.CLIENTE],
        actions: [PolicyAction.GET],
      },
      {
        path: '/api/users/:id/change-status',
        roles: [Role.ADMIN],
        actions: [PolicyAction.PATCH],
      },
      {
        path: '/api/users/:id/update-profile',
        roles: [Role.ADMIN, Role.GERENTE, Role.AUDITOR, Role.CLIENTE],
        actions: [PolicyAction.PATCH],
      },
    ]

    userPermissions.forEach(({ path, roles, actions }) => {
      roles.forEach((role) => {
        actions.forEach((action) => {
          permissions.push({
            role,
            resource: path,
            action,
            app: AppType.BACKEND,
            module: 'users',
            description: 'API de usuarios',
          })
        })
      })
    })

    // Roles endpoints
    permissions.push(
      {
        role: Role.ADMIN,
        resource: '/api/roles',
        action: PolicyAction.GET,
        app: AppType.BACKEND,
        module: 'roles',
        description: 'Listar roles',
      },
      {
        role: Role.GERENTE,
        resource: '/api/roles',
        action: PolicyAction.GET,
        app: AppType.BACKEND,
        module: 'roles',
        description: 'Listar roles',
      },
    )

    // Templates endpoints - Solo ADMIN
    ;[PolicyAction.GET, PolicyAction.POST].forEach((action) => {
      permissions.push({
        role: Role.ADMIN,
        resource: '/api/templates',
        action,
        app: AppType.BACKEND,
        module: 'templates',
        description: 'API de plantillas',
      })
    })
    ;[PolicyAction.GET, PolicyAction.PATCH, PolicyAction.HTTP_DELETE].forEach(
      (action) => {
        permissions.push({
          role: Role.ADMIN,
          resource: '/api/templates/:id',
          action,
          app: AppType.BACKEND,
          module: 'templates',
          description: 'API de plantillas',
        })
      },
    )

    // Audits endpoints - GERENTE + AUDITOR (limitado)
    ;[PolicyAction.GET, PolicyAction.POST].forEach((action) => {
      permissions.push({
        role: Role.GERENTE,
        resource: '/api/audits',
        action,
        app: AppType.BACKEND,
        module: 'audits',
        description: 'API de auditorías',
      })
    })
    ;[PolicyAction.GET, PolicyAction.PATCH, PolicyAction.HTTP_DELETE].forEach(
      (action) => {
        permissions.push({
          role: Role.GERENTE,
          resource: '/api/audits/:id',
          action,
          app: AppType.BACKEND,
          module: 'audits',
          description: 'API de auditorías',
        })
      },
    )
    permissions.push({
      role: Role.AUDITOR,
      resource: '/api/audits/:id',
      action: PolicyAction.GET,
      app: AppType.BACKEND,
      module: 'audits',
      description: 'Ver auditoría',
    })

    // Convertir a CasbinRule entities
    const casbinRules = permissions.map((perm) => {
      const rule = new CasbinRule()
      rule.ptype = 'p'
      rule.v0 = perm.role
      rule.v1 = perm.resource
      rule.v2 = perm.action
      rule.v3 = perm.app
      rule.v4 = perm.module
      rule.v5 = perm.description || null
      return rule
    })

    // Insertar en la base de datos
    const repository = dataSource.getRepository(CasbinRule)

    // Limpiar permisos existentes (DELETE FROM casbin_rule)
    await dataSource.query('DELETE FROM casbin_rule')

    // Insertar nuevos permisos
    await repository.save(casbinRules)

    console.log(
      `✅ ${casbinRules.length} permisos creados exitosamente (Casbin)`,
    )
  }
}
