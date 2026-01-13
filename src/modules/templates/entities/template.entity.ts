import { Entity, Column, OneToMany, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { StandardEntity } from './standard.entity'
import { TemplateStatus } from '../constants/template-status.enum'

/**
 * Template Entity
 *
 * Representa una plantilla de auditoría (ISO 27001, ASFI, etc.)
 * Las plantillas son globales del sistema
 *
 * Sistema de Versionado:
 * - draft: En edición, se puede modificar
 * - published: Publicada, READ-ONLY (no editable)
 * - archived: Obsoleta, no se usa en nuevas auditorías
 *
 * Para modificar una plantilla published, se debe crear una nueva versión
 * clonando la plantilla y sus standards con un nuevo número de versión
 *
 * @example
 * ```typescript
 * const template = {
 *   name: 'ISO 27001',
 *   description: 'Sistema de Gestión de Seguridad de la Información',
 *   version: 'v1.0',
 *   status: TemplateStatus.DRAFT,
 * }
 * ```
 */
@Entity('templates')
@Index(['name', 'version'], { unique: true })
export class TemplateEntity extends BaseEntity {
  /**
   * Nombre de la plantilla
   * Ejemplos: 'ISO 27001', 'ASFI', 'COBIT 5', 'ISO 9001'
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
   * Ejemplos: 'v1.0', 'v1.1', 'v2.0', '2013', '2022'
   * El formato puede ser libre según la convención que uses
   */
  @Column({ type: 'varchar', length: 20 })
  version: string

  /**
   * Estado del ciclo de vida de la plantilla
   * - draft: Borrador editable
   * - published: Publicada, READ-ONLY
   * - archived: Obsoleta
   */
  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus

  /**
   * Standards/controles de esta plantilla
   * Se eliminan en cascada si se elimina el template
   */
  @OneToMany(() => StandardEntity, (standard) => standard.template, {
    cascade: true,
  })
  standards: StandardEntity[]

  /**
   * Verifica si la plantilla es editable
   */
  get isEditable(): boolean {
    return this.status === TemplateStatus.DRAFT
  }

  /**
   * Verifica si la plantilla puede usarse en auditorías
   */
  get isUsable(): boolean {
    return this.status === TemplateStatus.PUBLISHED
  }
}
