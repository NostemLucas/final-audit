import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { TemplateEntity } from './template.entity'

/**
 * Standard Entity
 *
 * Representa un control, cláusula o estándar dentro de una plantilla
 * Estructura jerárquica (árbol) mediante parentId
 *
 * Ejemplos:
 * - ISO 27001: A.5 Políticas de seguridad de la información
 *   - A.5.1 Directrices de la dirección para la seguridad de la información
 *     - A.5.1.1 Políticas para la seguridad de la información
 *
 * @example
 * ```typescript
 * const standard = {
 *   templateId: 'uuid',
 *   parentId: null, // null = nivel raíz
 *   code: 'A.5',
 *   title: 'Políticas de seguridad de la información',
 *   description: '...',
 *   order: 1,
 *   level: 1,
 *   isAuditable: true,
 * }
 * ```
 */
@Entity('standards')
@Index(['templateId', 'code'], { unique: true })
@Index(['templateId', 'order'])
@Index(['parentId'])
export class StandardEntity extends BaseEntity {
  /**
   * ID de la plantilla a la que pertenece
   */
  @Column({ type: 'uuid' })
  templateId: string

  /**
   * Relación con la plantilla
   */
  @ManyToOne(() => TemplateEntity, (template) => template.standards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template: TemplateEntity

  /**
   * ID del standard padre (para estructura jerárquica)
   * null = nivel raíz
   */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null

  /**
   * Relación con el standard padre
   */
  @ManyToOne(() => StandardEntity, (standard) => standard.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: StandardEntity | null

  /**
   * Standards hijos de este standard
   */
  @OneToMany(() => StandardEntity, (standard) => standard.parent)
  children: StandardEntity[]

  /**
   * Código único del standard dentro de la plantilla
   * Ejemplos: 'A.5', 'A.5.1', 'A.5.1.1', '1.1', '1.2'
   */
  @Column({ type: 'varchar', length: 50 })
  code: string

  /**
   * Título del standard
   * Ejemplo: 'Políticas de seguridad de la información'
   */
  @Column({ type: 'varchar', length: 200 })
  title: string

  /**
   * Descripción detallada del standard
   */
  @Column({ type: 'text', nullable: true })
  description: string | null

  /**
   * Orden de visualización dentro de su nivel
   * Usado para ordenar hermanos
   */
  @Column({ type: 'int' })
  order: number

  /**
   * Nivel en la jerarquía (1 = raíz, 2 = hijo directo, etc.)
   * Calculado automáticamente basado en parentId
   */
  @Column({ type: 'int', default: 1 })
  level: number

  /**
   * Indica si este standard es auditable
   * Standards no auditables son solo organizacionales/agrupadores
   */
  @Column({ type: 'boolean', default: true })
  isAuditable: boolean

  /**
   * Estado de activación
   * Standards inactivos no aparecen en nuevas auditorías
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
