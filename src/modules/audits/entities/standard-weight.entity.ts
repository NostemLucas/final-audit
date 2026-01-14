import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { AuditEntity } from './audit.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'

/**
 * Standard Weight Entity
 *
 * Define el peso/ponderación de las secciones PRINCIPALES (padres) en una auditoría
 *
 * IMPORTANTE:
 * - Solo se crean pesos para standards PADRE (secciones principales)
 * - Ejemplo ISO 27001: Se crean pesos para A.5, A.6, A.7, ..., A.18 (11 secciones)
 * - NO se crean pesos para controles individuales (A.5.1, A.5.2, etc.)
 * - Los controles hijos se promedian para calcular el score de su padre
 *
 * @example ISO 27001
 * ```typescript
 * // Definir pesos para las 11 secciones principales
 * const weights = [
 *   { standardId: 'A.5',  weight: 10 },  // Políticas
 *   { standardId: 'A.6',  weight: 15 },  // Organización
 *   { standardId: 'A.7',  weight: 10 },  // Recursos Humanos
 *   { standardId: 'A.8',  weight: 15 },  // Gestión de Activos
 *   { standardId: 'A.9',  weight: 15 },  // Control de Acceso
 *   { standardId: 'A.10', weight: 5  },  // Criptografía
 *   { standardId: 'A.11', weight: 10 },  // Seguridad Física
 *   { standardId: 'A.12', weight: 10 },  // Seguridad Operacional
 *   { standardId: 'A.13', weight: 5  },  // Comunicaciones
 *   { standardId: 'A.14', weight: 5  },  // Desarrollo
 * ]
 * // Total: 100%
 * ```
 *
 * @example Cálculo de Score
 * ```typescript
 * // 1. Evaluar controles hijos (A.5.1, A.5.2)
 * A.5.1.score = 66.67  // obtuvo 2 de 3
 * A.5.2.score = 100    // obtuvo 3 de 3
 *
 * // 2. Calcular score de sección padre (A.5)
 * A.5.calculatedScore = avg(66.67, 100) = 83.34
 *
 * // 3. Aplicar peso de sección
 * A.5.weightedScore = 83.34 * 10 = 833.4
 *
 * // 4. Sumar todas las secciones
 * totalScore = (A.5.weighted + A.6.weighted + ...) / totalWeight
 * ```
 */
@Entity('standard_weights')
@Index(['auditId', 'standardId'], { unique: true })
@Index(['auditId'])
export class StandardWeightEntity extends BaseEntity {
  /**
   * ID de la auditoría
   */
  @Column({ type: 'uuid' })
  auditId: string

  @ManyToOne(() => AuditEntity, (audit) => audit.standardWeights, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity

  /**
   * ID del standard (sección padre)
   * IMPORTANTE: Debe ser un standard PADRE, no un control individual
   *
   * Ejemplo ISO 27001:
   * - ✅ Correcto: A.5, A.6, A.7 (secciones principales)
   * - ❌ Incorrecto: A.5.1, A.5.2 (controles individuales)
   */
  @Column({ type: 'uuid' })
  standardId: string

  @ManyToOne(() => StandardEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'standardId' })
  standard: StandardEntity

  /**
   * Peso de esta sección (0-100)
   *
   * El peso indica la importancia relativa de esta sección
   * en el score total de la auditoría
   *
   * Recomendación: Los pesos de todas las secciones deben sumar 100
   *
   * Ejemplos:
   * - Sección crítica: weight = 20 (vale 20% del total)
   * - Sección importante: weight = 15 (vale 15% del total)
   * - Sección opcional: weight = 5 (vale 5% del total)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  weight: number

  /**
   * Score calculado de la sección (0-100)
   *
   * Se calcula automáticamente como el promedio de los scores
   * de todos los controles hijos evaluados
   *
   * Ejemplo:
   * - A.5 tiene 2 controles: A.5.1 (score=66.67) y A.5.2 (score=100)
   * - calculatedScore = avg(66.67, 100) = 83.34
   *
   * Null si aún no se han evaluado controles
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  calculatedScore: number | null

  /**
   * Score manual (override)
   *
   * Permite al auditor asignar un score manualmente
   * en lugar de usar el calculado automáticamente
   *
   * Caso de uso:
   * - Auditor considera que aunque los controles individuales cumplan,
   *   la sección en general no está bien integrada
   * - Se puede bajar el score manualmente
   *
   * Si es null, se usa calculatedScore
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  manualScore: number | null

  /**
   * Justificación del score manual
   * Obligatorio si se usa manualScore
   */
  @Column({ type: 'text', nullable: true })
  manualScoreJustification: string | null

  /**
   * Número de controles evaluados en esta sección
   * Se actualiza automáticamente
   */
  @Column({ type: 'int', default: 0 })
  evaluatedControls: number

  /**
   * Número total de controles en esta sección
   * Se calcula al crear la auditoría
   */
  @Column({ type: 'int', default: 0 })
  totalControls: number

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Obtiene el score final a usar (manual o calculado)
   */
  get finalScore(): number | null {
    return this.manualScore ?? this.calculatedScore
  }

  /**
   * Obtiene el score ponderado (score * weight)
   */
  get weightedScore(): number | null {
    const score = this.finalScore
    if (score === null) return null
    return score * this.weight
  }

  /**
   * Obtiene el progreso de evaluación (0-100%)
   */
  get progress(): number {
    if (this.totalControls === 0) return 0
    return Math.round((this.evaluatedControls / this.totalControls) * 100)
  }

  /**
   * Verifica si todos los controles fueron evaluados
   */
  get isComplete(): boolean {
    return this.evaluatedControls === this.totalControls
  }
}
