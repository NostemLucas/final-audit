import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'
import { StandardEntity } from './standard.entity'

/**
 * Template Entity
 *
 * Representa una plantilla de auditoría (ISO 27001, ASFI, etc.)
 * Las plantillas son específicas de cada organización
 *
 * @example
 * ```typescript
 * const template = {
 *   name: 'ISO 27001:2013',
 *   description: 'Sistema de Gestión de Seguridad de la Información',
 *   version: '2013',
 *   organizationId: 'uuid',
 * }
 * ```
 */
@Entity('templates')
@Index(['organizationId', 'name'], { unique: true })
export class TemplateEntity extends BaseEntity {
  /**
   * Nombre de la plantilla
   * Ejemplos: 'ISO 27001', 'ASFI', 'COBIT 5'
   */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /**
   * Descripción de la plantilla
   */
  @Column({ type: 'text', nullable: true })
  description: string | null

  /**
   * Versión de la plantilla
   * Ejemplos: '2013', '2022', 'v1.0'
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string | null

  /**
   * Estado de activación
   * Templates inactivos no se pueden usar para nuevas auditorías
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean

  /**
   * ID de la organización dueña de esta plantilla
   */
  @Column({ type: 'uuid' })
  organizationId: string

  /**
   * Relación con la organización
   */
  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  /**
   * Standards/controles de esta plantilla
   */
  @OneToMany(() => StandardEntity, (standard) => standard.template, {
    cascade: true,
  })
  standards: StandardEntity[]
}
