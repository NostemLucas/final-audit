import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'

/**
 * Casbin Rule Entity
 *
 * Almacena las políticas de acceso de Casbin en la base de datos
 * Formato: p, role, resource, action
 *
 * Ejemplo:
 * - p, admin, /api/users, GET
 * - p, gerente, /admin/audits, read
 *
 * @see https://casbin.org/docs/adapters
 */
@Entity('casbin_rule')
@Index(['ptype', 'v0', 'v1', 'v2'])
export class CasbinRule {
  @PrimaryGeneratedColumn()
  id: number

  /**
   * Tipo de política (p = policy, g = grouping/role inheritance)
   */
  @Column({ type: 'varchar', length: 100 })
  ptype: string

  /**
   * v0: Subject (rol del usuario)
   * Ejemplo: 'admin', 'gerente', 'auditor', 'cliente'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  v0: string | null

  /**
   * v1: Object (recurso)
   * Ejemplo: '/api/users', '/admin/home', '/api/audits/:id'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  v1: string | null

  /**
   * v2: Action (acción)
   * Ejemplo: 'GET', 'POST', 'read', 'create'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  v2: string | null

  /**
   * v3: Extra field (metadata - app type)
   * Ejemplo: 'frontend', 'backend'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  v3: string | null

  /**
   * v4: Extra field (metadata - module)
   * Ejemplo: 'users', 'audits', 'templates'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  v4: string | null

  /**
   * v5: Extra field (metadata - description)
   * Ejemplo: 'Gestión de usuarios', 'Ver auditorías'
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  v5: string | null

  /**
   * v6: Extra field (reserved for future use)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  v6: string | null
}
