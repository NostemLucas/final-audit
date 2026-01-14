import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Not, IsNull } from 'typeorm'
import { AuditEntity } from '../entities/audit.entity'
import { EvaluationEntity } from '../entities/evaluation.entity'
import { StandardWeightEntity } from '../entities/standard-weight.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'
import { ComplianceStatus } from '../constants/compliance-status.enum'

/**
 * Audit Scoring Service
 *
 * Servicio encargado de calcular scores de auditorías
 *
 * Responsabilidades:
 * 1. Calcular score de una evaluación individual
 * 2. Calcular score de una sección (promedio de controles hijos)
 * 3. Calcular score total de la auditoría (ponderado por secciones)
 * 4. Actualizar progreso y compliance rate
 */
@Injectable()
export class AuditScoringService {
  constructor(
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,

    @InjectRepository(EvaluationEntity)
    private readonly evaluationRepository: Repository<EvaluationEntity>,

    @InjectRepository(StandardWeightEntity)
    private readonly weightRepository: Repository<StandardWeightEntity>,

    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
  ) {}

  /**
   * Calcula el score de una evaluación individual
   *
   * Formula: (obtainedLevel / expectedLevel) * 100
   *
   * @param evaluation - Evaluación a calcular
   * @returns Score calculado (0-100+)
   *
   * @example
   * obtained = Nivel 2, expected = Nivel 3 → score = 66.67
   * obtained = Nivel 3, expected = Nivel 3 → score = 100
   * obtained = Nivel 4, expected = Nivel 3 → score = 133.33 (excede)
   */
  calculateEvaluationScore(evaluation: EvaluationEntity): number {
    if (!evaluation.obtainedLevel || !evaluation.expectedLevel) {
      return 0
    }

    const score =
      (evaluation.obtainedLevel.level / evaluation.expectedLevel.level) * 100

    return Math.round(score * 100) / 100 // Redondear a 2 decimales
  }

  /**
   * Calcula el gap entre objetivo y obtenido
   *
   * Formula: targetLevel - obtainedLevel
   *
   * @param evaluation - Evaluación a calcular
   * @returns Gap (negativo = falta, 0 = alcanzado, positivo = superado)
   *
   * @example
   * target = Nivel 4, obtained = Nivel 2 → gap = -2 (falta 2 niveles)
   * target = Nivel 3, obtained = Nivel 3 → gap = 0 (alcanzado)
   * target = Nivel 3, obtained = Nivel 4 → gap = 1 (superado)
   */
  calculateEvaluationGap(evaluation: EvaluationEntity): number {
    if (!evaluation.obtainedLevel || !evaluation.targetLevel) {
      return 0
    }

    return evaluation.obtainedLevel.level - evaluation.targetLevel.level
  }

  /**
   * Determina el estado de cumplimiento basado en score
   *
   * @param score - Score calculado (0-100)
   * @returns Estado de cumplimiento
   */
  determineComplianceStatus(score: number): ComplianceStatus {
    if (score >= 100) return ComplianceStatus.COMPLIANT
    if (score >= 75) return ComplianceStatus.PARTIAL
    return ComplianceStatus.NON_COMPLIANT
  }

  /**
   * Calcula el score de una sección RECURSIVAMENTE
   *
   * Soporta jerarquías multinivel (ej: A.5 → A.5.1 → A.5.1.1)
   *
   * Algoritmo:
   * 1. Obtener hijos directos del nodo
   * 2. Para cada hijo:
   *    - Si es evaluable (hoja) → obtener su evaluation.score
   *    - Si NO es evaluable (nodo intermedio) → calcular recursivamente su score
   * 3. Promediar todos los scores de los hijos
   *
   * @param auditId - ID de la auditoría
   * @param sectionId - ID de la sección (cualquier nivel)
   * @returns Score calculado (0-100)
   *
   * @example Jerarquía multinivel:
   * A.5 (sección)
   * ├── A.5.1 (subsección)
   * │   ├── A.5.1.1 (control) → evaluation.score = 66.67
   * │   └── A.5.1.2 (control) → evaluation.score = 100
   * └── A.5.2 (subsección)
   *     └── A.5.2.1 (control) → evaluation.score = 100
   *
   * Cálculo:
   * A.5.1.score = avg(66.67, 100) = 83.34
   * A.5.2.score = avg(100) = 100
   * A.5.score = avg(83.34, 100) = 91.67
   */
  async calculateSectionScore(
    auditId: string,
    sectionId: string,
  ): Promise<number> {
    // 1. Obtener hijos directos de este nodo
    const directChildren = await this.getDirectChildren(sectionId)

    if (directChildren.length === 0) {
      return 0
    }

    // 2. Calcular score de cada hijo
    const childScores: number[] = []

    for (const child of directChildren) {
      let childScore = 0

      if (child.isAuditable) {
        // Es un control evaluable → obtener evaluation
        const evaluation = await this.evaluationRepository.findOne({
          where: {
            auditId,
            standardId: child.id,
          },
        })

        if (evaluation && evaluation.score !== null) {
          childScore = evaluation.score
        } else {
          // Si no tiene evaluación, no lo contamos
          continue
        }
      } else {
        // Es un nodo intermedio → calcular recursivamente
        childScore = await this.calculateSectionScore(auditId, child.id)

        if (childScore === 0) {
          // Si el hijo no tiene evaluaciones, no lo contamos
          continue
        }
      }

      childScores.push(childScore)
    }

    // 3. Si no hay scores válidos, retornar 0
    if (childScores.length === 0) {
      return 0
    }

    // 4. Calcular promedio
    const avgScore = childScores.reduce((sum, s) => sum + s, 0) / childScores.length

    return Math.round(avgScore * 100) / 100
  }

  /**
   * Recalcula el score de una sección y actualiza StandardWeight
   *
   * @param auditId - ID de la auditoría
   * @param sectionId - ID de la sección
   */
  async recalculateSectionScore(
    auditId: string,
    sectionId: string,
  ): Promise<void> {
    // 1. Calcular nuevo score (recursivo para jerarquías multinivel)
    const calculatedScore = await this.calculateSectionScore(
      auditId,
      sectionId,
    )

    // 2. Contar controles evaluados (todos los descendientes evaluables)
    const allDescendants = await this.getAllEvaluableDescendants(sectionId)
    const evaluatedCount = await this.evaluationRepository.count({
      where: {
        auditId,
        standardId: In(allDescendants.map((c) => c.id)),
        obtainedLevelId: Not(IsNull()),
      },
    })

    // 3. Actualizar StandardWeight
    await this.weightRepository.update(
      { auditId, standardId: sectionId },
      {
        calculatedScore,
        evaluatedControls: evaluatedCount,
      },
    )
  }

  /**
   * Calcula el score total de la auditoría
   *
   * El score total es la suma ponderada de los scores de todas las secciones
   *
   * Formula:
   * totalScore = sum(sectionScore * sectionWeight) / sum(sectionWeight)
   *
   * @param auditId - ID de la auditoría
   * @returns Score total (0-100)
   *
   * @example
   * A.5: score=83.34, weight=10 → weighted=833.4
   * A.6: score=75.00, weight=15 → weighted=1125
   * totalScore = (833.4 + 1125 + ...) / (10 + 15 + ...) = 85.58
   */
  async calculateTotalScore(auditId: string): Promise<number> {
    // 1. Obtener todos los pesos de secciones
    const weights = await this.weightRepository.find({
      where: { auditId },
    })

    if (weights.length === 0) {
      return 0
    }

    // 2. Calcular suma ponderada
    let weightedSum = 0
    let totalWeight = 0

    for (const weight of weights) {
      const score = weight.finalScore // manualScore ?? calculatedScore

      if (score !== null) {
        weightedSum += score * weight.weight
        totalWeight += weight.weight
      }
    }

    if (totalWeight === 0) {
      return 0
    }

    const totalScore = weightedSum / totalWeight

    return Math.round(totalScore * 100) / 100
  }

  /**
   * Calcula el porcentaje de cumplimiento
   *
   * Compliance rate = (controles conformes / controles evaluados) * 100
   *
   * @param auditId - ID de la auditoría
   * @returns Compliance rate (0-100)
   */
  async calculateComplianceRate(auditId: string): Promise<number> {
    const totalEvaluated = await this.evaluationRepository.count({
      where: {
        auditId,
        obtainedLevelId: Not(IsNull()),
      },
    })

    if (totalEvaluated === 0) {
      return 0
    }

    const compliant = await this.evaluationRepository.count({
      where: {
        auditId,
        complianceStatus: In([
          ComplianceStatus.COMPLIANT,
          ComplianceStatus.NOT_APPLICABLE,
        ]),
      },
    })

    const rate = (compliant / totalEvaluated) * 100

    return Math.round(rate * 100) / 100
  }

  /**
   * Recalcula todos los scores de una auditoría
   *
   * Proceso completo:
   * 1. Recalcular scores de todas las secciones
   * 2. Recalcular score total
   * 3. Recalcular compliance rate
   * 4. Actualizar contadores de progreso
   *
   * @param auditId - ID de la auditoría
   */
  async recalculateAuditScores(auditId: string): Promise<void> {
    // 1. Obtener todas las secciones
    const weights = await this.weightRepository.find({
      where: { auditId },
    })

    // 2. Recalcular score de cada sección
    for (const weight of weights) {
      await this.recalculateSectionScore(auditId, weight.standardId)
    }

    // 3. Calcular score total
    const totalScore = await this.calculateTotalScore(auditId)

    // 4. Calcular compliance rate
    const complianceRate = await this.calculateComplianceRate(auditId)

    // 5. Contar evaluaciones
    const evaluatedControls = await this.evaluationRepository.count({
      where: {
        auditId,
        obtainedLevelId: Not(IsNull()),
      },
    })

    // 6. Actualizar auditoría
    await this.auditRepository.update(auditId, {
      totalScore,
      complianceRate,
      evaluatedControls,
    })
  }

  /**
   * Obtiene los hijos DIRECTOS de un nodo (1 nivel)
   *
   * @param parentId - ID del nodo padre
   * @returns Lista de hijos directos
   */
  private async getDirectChildren(
    parentId: string,
  ): Promise<StandardEntity[]> {
    return await this.standardRepository.find({
      where: { parentId },
      order: { order: 'ASC' },
    })
  }

  /**
   * Obtiene TODOS los descendientes evaluables de un nodo (recursivo)
   *
   * Atraviesa toda la jerarquía y retorna solo los nodos que tienen isAuditable=true
   *
   * @param parentId - ID del nodo raíz
   * @returns Lista de todos los controles evaluables descendientes
   *
   * @example
   * A.5 → [A.5.1.1, A.5.1.2, A.5.2.1, A.5.2.2, ...]
   */
  private async getAllEvaluableDescendants(
    parentId: string,
  ): Promise<StandardEntity[]> {
    const result: StandardEntity[] = []

    // Obtener hijos directos
    const directChildren = await this.getDirectChildren(parentId)

    for (const child of directChildren) {
      if (child.isAuditable) {
        // Es evaluable → agregarlo
        result.push(child)
      } else {
        // No es evaluable → buscar recursivamente en sus hijos
        const descendants = await this.getAllEvaluableDescendants(child.id)
        result.push(...descendants)
      }
    }

    return result
  }
}
