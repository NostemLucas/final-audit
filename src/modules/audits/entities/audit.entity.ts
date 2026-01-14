import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { TemplateEntity } from '../../templates/entities/template.entity'
import { MaturityFrameworkEntity } from '../../maturity/entities/maturity-framework.entity'
import { MaturityLevelEntity } from '../../maturity/entities/maturity-level.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'
import { AuditType } from '../constants/audit-type.enum'
import { AuditStatus } from '../constants/audit-status.enum'
import { EvaluationEntity } from './evaluation.entity'
import { StandardWeightEntity } from './standard-weight.entity'

/**
 * Audit Entity
 *
 * Representa una auditoría específica a una organización
 * Combina:
 * - Template (QUÉ auditar - norma/plantilla)
 * - MaturityFramework (CÓMO evaluar - niveles de madurez)
 * - Organization (A QUIÉN auditar)
 *
 * @example
 * ```typescript
 * const audit = {
 *   name: 'Auditoría ISO 27001 - ACME Corp 2024',
 *   templateId: 'uuid-iso27001',
 *   maturityFrameworkId: 'uuid-cobit5',
 *   organizationId: 'uuid-acme',
 *   auditType: AuditType.INICIAL,
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-03-31'),
 *   status: AuditStatus.IN_PROGRESS,
 *   defaultExpectedLevelId: 'uuid-nivel-3', // Por defecto esperar nivel 3
 *   defaultTargetLevelId: 'uuid-nivel-4',   // Por defecto objetivo nivel 4
 * }
 * ```
 */
@Entity('audits')
@Index(['organizationId', 'status'])
@Index(['templateId'])
@Index(['maturityFrameworkId'])
@Index(['startDate', 'endDate'])
export class AuditEntity extends BaseEntity {
  /**
   * Nombre descriptivo de la auditoría
   * Ejemplo: 'Auditoría ISO 27001 - ACME Corp 2024'
   */
  @Column({ type: 'varchar', length: 200 })
  name: string

  /**
   * Descripción de la auditoría
   */
  @Column({ type: 'text', nullable: true })
  description: string | null

  /**
   * ID de la plantilla a usar (ISO 27001, ASFI, etc.)
   */
  @Column({ type: 'uuid' })
  templateId: string

  @ManyToOne(() => TemplateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateId' })
  template: TemplateEntity

  /**
   * ID del framework de madurez a usar (COBIT 5, CMMI, etc.)
   */
  @Column({ type: 'uuid' })
  maturityFrameworkId: string

  @ManyToOne(() => MaturityFrameworkEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maturityFrameworkId' })
  maturityFramework: MaturityFrameworkEntity

  /**
   * ID de la organización a auditar
   */
  @Column({ type: 'uuid' })
  organizationId: string

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  /**
   * Tipo de auditoría
   */
  @Column({
    type: 'enum',
    enum: AuditType,
    default: AuditType.INICIAL,
  })
  auditType: AuditType

  /**
   * Estado de la auditoría
   */
  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.DRAFT,
  })
  status: AuditStatus

  /**
   * Fecha de inicio de la auditoría
   */
  @Column({ type: 'date' })
  startDate: Date

  /**
   * Fecha de fin de la auditoría
   */
  @Column({ type: 'date' })
  endDate: Date

  /**
   * Nivel esperado por defecto para todos los controles
   * Los controles individuales pueden override este valor
   */
  @Column({ type: 'uuid', nullable: true })
  defaultExpectedLevelId: string | null

  @ManyToOne(() => MaturityLevelEntity, { nullable: true })
  @JoinColumn({ name: 'defaultExpectedLevelId' })
  defaultExpectedLevel: MaturityLevelEntity | null

  /**
   * Nivel objetivo por defecto para todos los controles
   * Los controles individuales pueden override este valor
   */
  @Column({ type: 'uuid', nullable: true })
  defaultTargetLevelId: string | null

  @ManyToOne(() => MaturityLevelEntity, { nullable: true })
  @JoinColumn({ name: 'defaultTargetLevelId' })
  defaultTargetLevel: MaturityLevelEntity | null

  /**
   * Score total de la auditoría (0-100)
   * Calculado automáticamente basado en evaluaciones y pesos
   * Puede ser null si no se ha calculado aún
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalScore: number | null

  /**
   * Porcentaje de cumplimiento general (0-100)
   * Basado en cuántos controles cumplen vs total
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  complianceRate: number | null

  /**
   * Número total de controles a evaluar
   * Calculado al crear la auditoría
   */
  @Column({ type: 'int', default: 0 })
  totalControls: number

  /**
   * Número de controles evaluados
   * Se actualiza conforme se evalúan
   */
  @Column({ type: 'int', default: 0 })
  evaluatedControls: number

  /**
   * Observaciones generales de la auditoría
   */
  @Column({ type: 'text', nullable: true })
  observations: string | null

  /**
   * Conclusiones finales de la auditoría
   */
  @Column({ type: 'text', nullable: true })
  conclusions: string | null

  /**
   * Recomendaciones generales
   */
  @Column({ type: 'text', nullable: true })
  recommendations: string | null

  /**
   * Evaluaciones de controles individuales
   */
  @OneToMany(() => EvaluationEntity, (evaluation) => evaluation.audit, {
    cascade: true,
  })
  evaluations: EvaluationEntity[]

  /**
   * Pesos de las secciones principales
   */
  @OneToMany(() => StandardWeightEntity, (weight) => weight.audit, {
    cascade: true,
  })
  standardWeights: StandardWeightEntity[]

  /**
   * Obtiene el progreso de la auditoría (0-100%)
   */
  get progress(): number {
    if (this.totalControls === 0) return 0
    return Math.round((this.evaluatedControls / this.totalControls) * 100)
  }

  /**
   * Verifica si la auditoría está completa
   */
  get isComplete(): boolean {
    return this.evaluatedControls === this.totalControls
  }

  /**
   * Verifica si cumple (score >= 75%)
   */
  get isCompliant(): boolean {
    return this.totalScore !== null && this.totalScore >= 75
  }
}
