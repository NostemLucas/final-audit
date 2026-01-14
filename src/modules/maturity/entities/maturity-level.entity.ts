import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { MaturityFrameworkEntity } from './maturity-framework.entity'

/**
 * Maturity Level Entity
 *
 * Representa un nivel específico dentro de un framework de madurez
 *
 * Cada nivel tiene:
 * - Un número de nivel (0-5 típicamente)
 * - Nombre y descripción
 * - Color para visualización
 * - Recomendaciones y observaciones predefinidas
 *
 * @example COBIT 5 - Nivel 3
 * ```typescript
 * const level3 = {
 *   frameworkId: 'uuid-cobit5',
 *   level: 3,
 *   name: 'Definido',
 *   shortName: 'Def',
 *   description: 'Los procesos están documentados, estandarizados...',
 *   color: '#F59E0B', // Amarillo/Naranja
 *   icon: '🟡',
 *   recommendations: 'Se recomienda implementar métricas...',
 *   observations: 'El proceso está documentado pero no se mide...',
 *   order: 3
 * }
 * ```
 */
@Entity('maturity_levels')
@Index(['frameworkId', 'level'], { unique: true })
export class MaturityLevelEntity extends BaseEntity {
  /**
   * Framework al que pertenece este nivel
   */
  @Column({ type: 'uuid' })
  frameworkId: string

  @ManyToOne(() => MaturityFrameworkEntity, (framework) => framework.levels, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'frameworkId' })
  framework: MaturityFrameworkEntity

  /**
   * Número del nivel de madurez
   * Ejemplos:
   * - COBIT 5: 0, 1, 2, 3, 4, 5
   * - CMMI: 1, 2, 3, 4, 5
   */
  @Column({ type: 'int' })
  level: number

  /**
   * Nombre completo del nivel
   * Ejemplos COBIT 5:
   * - 0: 'Inexistente'
   * - 1: 'Inicial'
   * - 2: 'Repetible'
   * - 3: 'Definido'
   * - 4: 'Administrado'
   * - 5: 'Optimizado'
   */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /**
   * Nombre corto/abreviado del nivel
   * Útil para visualizaciones compactas
   * Ejemplos: 'N/A', 'Init', 'Rep', 'Def', 'Adm', 'Opt'
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  shortName: string | null

  /**
   * Descripción completa del nivel
   * Explica qué características debe tener un proceso
   * para estar en este nivel de madurez
   */
  @Column({ type: 'text' })
  description: string

  /**
   * Color en formato hexadecimal para visualización
   * Se usa en reportes, dashboards, gráficos, etc.
   * Ejemplos:
   * - Rojo (bajo): #EF4444, #DC2626
   * - Naranja: #F59E0B, #FB923C
   * - Amarillo: #EAB308, #FBBF24
   * - Verde (alto): #10B981, #22C55E
   * - Azul: #3B82F6, #6366F1
   */
  @Column({ type: 'varchar', length: 7 })
  color: string

  /**
   * Icono o emoji representativo del nivel
   * Ejemplos: '🔴', '🟡', '🟢', '⭐', '✅'
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null

  /**
   * Recomendaciones para alcanzar o mejorar este nivel
   * Guía para auditores y evaluados sobre qué implementar
   */
  @Column({ type: 'text', nullable: true })
  recommendations: string | null

  /**
   * Observaciones típicas en este nivel
   * Patrones comunes que se observan en organizaciones
   * que están en este nivel de madurez
   */
  @Column({ type: 'text', nullable: true })
  observations: string | null

  /**
   * Orden de visualización
   * Normalmente coincide con el nivel, pero permite
   * personalizar el orden si es necesario
   */
  @Column({ type: 'int' })
  order: number

  /**
   * Determina si es el nivel mínimo aceptable
   * Útil para marcar umbrales de cumplimiento
   */
  @Column({ type: 'boolean', default: false })
  isMinimumAcceptable: boolean

  /**
   * Determina si es el nivel objetivo/ideal
   * Útil para marcar metas organizacionales
   */
  @Column({ type: 'boolean', default: false })
  isTarget: boolean

  /**
   * Obtiene una representación visual del nivel
   */
  get displayName(): string {
    return this.icon ? `${this.icon} ${this.name}` : this.name
  }

  /**
   * Obtiene el nombre a mostrar en UI (corto o completo)
   */
  get uiName(): string {
    return this.shortName || this.name
  }
}
