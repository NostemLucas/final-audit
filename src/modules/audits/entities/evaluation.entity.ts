import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { AuditEntity } from './audit.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'
import { MaturityLevelEntity } from '../../maturity/entities/maturity-level.entity'
import { ComplianceStatus } from '../constants/compliance-status.enum'

/**
 * Evaluation Entity
 *
 * Representa la evaluación de un control/standard ESPECÍFICO dentro de una auditoría
 *
 * IMPORTANTE:
 * - Solo se crean evaluaciones para controles con isAuditable = true (hojas del árbol)
 * - Los controles padre calculan su score agregando los scores de sus hijos
 * - Los pesos se asignan a nivel de secciones padre (StandardWeight)
 *
 * @example
 * ```typescript
 * const evaluation = {
 *   auditId: 'uuid-audit',
 *   standardId: 'uuid-A.5.1',  // Control evaluable (hoja)
 *
 *   // Niveles de madurez
 *   expectedLevelId: 'uuid-nivel-3',  // Se espera nivel 3 (Definido)
 *   obtainedLevelId: 'uuid-nivel-2',  // Se obtuvo nivel 2 (Repetible)
 *   targetLevelId: 'uuid-nivel-4',    // Se quiere llegar a nivel 4 (Administrado)
 *
 *   // Resultados (calculados automáticamente)
 *   score: 66.67,              // 2/3 = 66.67%
 *   gap: -2,                   // 4 - 2 = brecha de 2 niveles
 *   complianceStatus: ComplianceStatus.PARTIAL,
 *
 *   // Evidencias
 *   evidence: 'Se encontró política documentada pero no se evidencia capacitación formal',
 *   observations: 'La política existe desde hace 6 meses',
 *   recommendations: 'Implementar programa de capacitación trimestral',
 *
 *   // Auditor
 *   evaluatedBy: 'uuid-user-auditor',
 *   evaluatedAt: new Date(),
 * }
 * ```
 */
@Entity('evaluations')
@Index(['auditId', 'standardId'], { unique: true })
@Index(['auditId', 'complianceStatus'])
@Index(['evaluatedBy'])
export class EvaluationEntity extends BaseEntity {
  /**
   * ID de la auditoría a la que pertenece
   */
  @Column({ type: 'uuid' })
  auditId: string

  @ManyToOne(() => AuditEntity, (audit) => audit.evaluations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'auditId' })
  audit: AuditEntity

  /**
   * ID del standard/control evaluado
   * IMPORTANTE: Debe ser un standard con isAuditable = true
   */
  @Column({ type: 'uuid' })
  standardId: string

  @ManyToOne(() => StandardEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'standardId' })
  standard: StandardEntity

  // ==========================================
  // Niveles de Madurez
  // ==========================================

  /**
   * Nivel esperado/mínimo para este control
   * El control debe alcanzar al menos este nivel para cumplir
   */
  @Column({ type: 'uuid' })
  expectedLevelId: string

  @ManyToOne(() => MaturityLevelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'expectedLevelId' })
  expectedLevel: MaturityLevelEntity

  /**
   * Nivel obtenido en la evaluación
   * Nivel real que tiene la organización para este control
   */
  @Column({ type: 'uuid', nullable: true })
  obtainedLevelId: string | null

  @ManyToOne(() => MaturityLevelEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'obtainedLevelId' })
  obtainedLevel: MaturityLevelEntity | null

  /**
   * Nivel objetivo/target para este control
   * Nivel al que se quiere llegar (puede ser mayor que el esperado)
   */
  @Column({ type: 'uuid', nullable: true })
  targetLevelId: string | null

  @ManyToOne(() => MaturityLevelEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'targetLevelId' })
  targetLevel: MaturityLevelEntity | null

  // ==========================================
  // Resultados Calculados
  // ==========================================

  /**
   * Score de esta evaluación (0-100)
   * Calculado como: (obtainedLevel / expectedLevel) * 100
   *
   * Ejemplos:
   * - obtained=2, expected=3 → score=66.67
   * - obtained=3, expected=3 → score=100
   * - obtained=4, expected=3 → score=133.33 (excede expectativa)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number | null

  /**
   * Brecha entre objetivo y obtenido
   * gap = targetLevel - obtainedLevel
   *
   * Ejemplos:
   * - target=4, obtained=2 → gap=2 (falta 2 niveles)
   * - target=3, obtained=3 → gap=0 (alcanzó objetivo)
   * - target=3, obtained=4 → gap=-1 (superó objetivo)
   */
  @Column({ type: 'int', nullable: true })
  gap: number | null

  /**
   * Estado de cumplimiento
   * Se calcula basado en la comparación obtained vs expected
   */
  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.PENDING,
  })
  complianceStatus: ComplianceStatus

  // ==========================================
  // Evidencias y Documentación
  // ==========================================

  /**
   * Evidencias documentadas
   * Descripción de lo que se encontró durante la auditoría
   */
  @Column({ type: 'text', nullable: true })
  evidence: string | null

  /**
   * Observaciones del auditor
   * Comentarios sobre el estado actual
   */
  @Column({ type: 'text', nullable: true })
  observations: string | null

  /**
   * Recomendaciones para mejorar
   * Acciones sugeridas para alcanzar el nivel esperado/objetivo
   */
  @Column({ type: 'text', nullable: true })
  recommendations: string | null

  /**
   * Plan de acción acordado
   * Acciones concretas que implementará la organización
   */
  @Column({ type: 'text', nullable: true })
  actionPlan: string | null

  /**
   * Fecha límite para implementar mejoras (si aplica)
   */
  @Column({ type: 'date', nullable: true })
  dueDate: Date | null

  // ==========================================
  // Auditoría
  // ==========================================

  /**
   * ID del usuario auditor que realizó la evaluación
   */
  @Column({ type: 'uuid', nullable: true })
  evaluatedBy: string | null

  /**
   * Fecha en que se realizó la evaluación
   */
  @Column({ type: 'timestamp', nullable: true })
  evaluatedAt: Date | null

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Verifica si cumple con el nivel esperado
   */
  get meetsExpectation(): boolean {
    if (!this.obtainedLevel || !this.expectedLevel) return false
    return this.obtainedLevel.level >= this.expectedLevel.level
  }

  /**
   * Verifica si alcanzó el objetivo
   */
  get meetsTarget(): boolean {
    if (!this.obtainedLevel || !this.targetLevel) return false
    return this.obtainedLevel.level >= this.targetLevel.level
  }

  /**
   * Verifica si ha sido evaluado
   */
  get isEvaluated(): boolean {
    return this.obtainedLevelId !== null && this.evaluatedAt !== null
  }
}
