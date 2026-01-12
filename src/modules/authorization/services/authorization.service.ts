import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { newEnforcer, Enforcer } from 'casbin'
import TypeORMAdapter from 'typeorm-adapter'
import * as path from 'path'
import type { Role } from '../../users/entities/user.entity'

/**
 * Authorization Service
 *
 * Servicio central para verificar permisos usando Casbin
 * Implementa RBAC (Role-Based Access Control)
 *
 * @example
 * ```typescript
 * // En un guard o service
 * const hasPermission = await this.authorizationService.checkPermission(
 *   'admin',
 *   '/api/users',
 *   'GET'
 * )
 * ```
 */
@Injectable()
export class AuthorizationService implements OnModuleInit {
  private enforcer: Enforcer

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Inicializa Casbin al arrancar el módulo
   */
  async onModuleInit(): Promise<void> {
    // Path al modelo de Casbin
    const modelPath = path.join(__dirname, '..', 'model.conf')

    // IMPORTANTE: TypeORMAdapter requiere las opciones de conexión
    // Extraemos las opciones del DataSource existente para reutilizar la misma configuración
    // Esto evita problemas de credenciales duplicadas
    const adapter = await TypeORMAdapter.newAdapter(this.dataSource.options)

    // Crear enforcer de Casbin
    this.enforcer = await newEnforcer(modelPath, adapter)

    // Cargar políticas desde la BD
    await this.enforcer.loadPolicy()

    console.log('✅ Casbin enforcer inicializado correctamente')
  }

  /**
   * Verifica si un rol tiene permiso para realizar una acción sobre un recurso
   *
   * @param roles - Rol(es) del usuario
   * @param resource - Recurso (ruta o endpoint)
   * @param action - Acción (GET, POST, read, create, etc.)
   * @returns true si tiene permiso, false si no
   *
   * @example
   * ```typescript
   * // Verificar permiso backend
   * await checkPermission(['admin'], '/api/users', 'GET')
   *
   * // Verificar permiso frontend
   * await checkPermission(['gerente'], '/admin/audits', 'read')
   * ```
   */
  async checkPermission(
    roles: Role | Role[],
    resource: string,
    action: string,
  ): Promise<boolean> {
    const roleArray = Array.isArray(roles) ? roles : [roles]

    // Verificar si ALGUNO de los roles tiene permiso
    for (const role of roleArray) {
      const hasPermission = await this.enforcer.enforce(role, resource, action)
      if (hasPermission) {
        return true
      }
    }

    return false
  }

  /**
   * Agrega una nueva política de permiso
   *
   * @param role - Rol al que se le asigna el permiso
   * @param resource - Recurso
   * @param action - Acción
   */
  async addPermission(
    role: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    return await this.enforcer.addPolicy(role, resource, action)
  }

  /**
   * Remueve una política de permiso
   *
   * @param role - Rol
   * @param resource - Recurso
   * @param action - Acción
   */
  async removePermission(
    role: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    return await this.enforcer.removePolicy(role, resource, action)
  }

  /**
   * Obtiene todos los permisos de un rol
   *
   * @param role - Rol
   * @returns Lista de permisos [resource, action]
   */
  async getPermissionsForRole(role: string): Promise<string[][]> {
    return await this.enforcer.getPermissionsForUser(role)
  }

  /**
   * Recarga las políticas desde la base de datos
   * Útil después de modificar permisos
   */
  async reloadPolicies(): Promise<void> {
    await this.enforcer.loadPolicy()
  }
}
