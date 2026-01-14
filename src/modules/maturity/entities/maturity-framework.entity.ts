import { Entity, Column, OneToMany, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { MaturityLevelEntity } from './maturity-level.entity'

/**
 * Maturity Framework Entity
 *
 * Representa un framework de madurez organizacional
 * Ejemplos: COBIT 5, CMMI, ISO/IEC 15504 (SPICE)
 *
 * Cada framework define su propia escala de niveles de madurez
 * que pueden ser utilizados para evaluar controles/normas
 *
 * @example
 * ```typescript
 * const cobit5 = {
 *   name: 'COBIT 5',
 *   code: 'cobit5',
 *   description: 'Framework de gobierno y gestión de TI empresarial',
 *   minLevel: 0,
 *   maxLevel: 5,
 *   isActive: true
 * }
 * ```
 */
@Entity('maturity_frameworks')
@Index(['code'], { unique: true })
export class MaturityFrameworkEntity extends BaseEntity {
  /**
   * Nombre del framework
   * Ejemplos: 'COBIT 5', 'CMMI', 'ISO/IEC 15504', 'Modelo Propio'
   */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /**
   * Código único identificador
   * Ejemplos: 'cobit5', 'cmmi', 'spice', 'custom'
   */
  @Column({ type: 'varchar', length: 50 })
  code: string

  /**
   * Descripción del framework
   */
  @Column({ type: 'text', nullable: true })
  description: string | null

  /**
   * Nivel mínimo del framework
   * Ejemplo: 0 para COBIT 5 (0: Inexistente)
   *          1 para CMMI (1: Inicial)
   */
  @Column({ type: 'int', default: 0 })
  minLevel: number

  /**
   * Nivel máximo del framework
   * Ejemplo: 5 para COBIT 5 (5: Optimizado)
   *          5 para CMMI (5: En optimización)
   */
  @Column({ type: 'int', default: 5 })
  maxLevel: number

  /**
   * Indica si el framework está activo
   * Solo frameworks activos pueden ser asignados a nuevas plantillas
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean

  /**
   * Niveles de madurez de este framework
   * Se eliminan en cascada si se elimina el framework
   */
  @OneToMany(() => MaturityLevelEntity, (level) => level.framework, {
    cascade: true,
  })
  levels: MaturityLevelEntity[]

  /**
   * Obtiene el rango de niveles del framework
   */
  get levelRange(): string {
    return `${this.minLevel}-${this.maxLevel}`
  }

  /**
   * Obtiene la cantidad total de niveles
   */
  get totalLevels(): number {
    return this.maxLevel - this.minLevel + 1
  }
}
