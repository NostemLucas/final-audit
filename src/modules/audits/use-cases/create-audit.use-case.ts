import { Injectable, BadRequestException } from '@nestjs/common'
import { Transactional } from '@core/database/decorators/transactional.decorator'
import { AuditRepository } from '../repositories/audit.repository'
import { StandardWeightRepository } from '../repositories/standard-weight.repository'
import { TemplateRepository } from '../../templates/repositories/template.repository'
import { CreateAuditDto } from '../dto/create-audit.dto'
import { AuditEntity } from '../entities/audit.entity'
import { StandardEntity } from '../../templates/entities/standard.entity'

/**
 * Create Audit Use Case
 *
 * Creates a new audit and initializes standard weights for parent sections
 */
@Injectable()
export class CreateAuditUseCase {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly weightRepository: StandardWeightRepository,
    private readonly templateRepository: TemplateRepository,
  ) {}

  @Transactional()
  async execute(dto: CreateAuditDto): Promise<AuditEntity> {
    // 1. Validate dates
    const startDate = new Date(dto.startDate)
    const endDate = new Date(dto.endDate)

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date')
    }

    // 2. Get template with standards to count total controls
    const template = await this.templateRepository.findOneWithRelations(
      dto.templateId,
    )

    if (!template) {
      throw new BadRequestException('Template not found')
    }

    // Count total auditable controls
    const totalControls =
      template.standards?.filter((s) => s.isAuditable).length || 0

    // 3. Create audit
    const audit = await this.auditRepository.save({
      ...dto,
      totalControls,
      evaluatedControls: 0,
    })

    // 4. Initialize weights for parent sections (if template has standards)
    if (template.standards && template.standards.length > 0) {
      const parentStandards = template.standards.filter(
        (s) => s.parentId === null,
      )

      const defaultWeight =
        parentStandards.length > 0
          ? Math.round((100 / parentStandards.length) * 100) / 100
          : 0

      for (const parent of parentStandards) {
        // Count ALL evaluable descendants (recursive for multilevel hierarchies)
        const childrenControls = this.countEvaluableDescendants(
          parent.id,
          template.standards,
        )

        await this.weightRepository.save({
          auditId: audit.id,
          standardId: parent.id,
          weight: defaultWeight,
          totalControls: childrenControls,
          evaluatedControls: 0,
        })
      }
    }

    return audit
  }

  /**
   * Cuenta todos los descendientes evaluables de un nodo (recursivo)
   *
   * Soporta jerarquías multinivel: A.5 → A.5.1 → A.5.1.1
   *
   * @param parentId - ID del nodo padre
   * @param allStandards - Lista completa de standards del template
   * @returns Cantidad de controles evaluables descendientes
   */
  private countEvaluableDescendants(
    parentId: string,
    allStandards: StandardEntity[],
  ): number {
    let count = 0

    // Encontrar hijos directos
    const directChildren = allStandards.filter((s) => s.parentId === parentId)

    for (const child of directChildren) {
      if (child.isAuditable) {
        // Es evaluable → contar
        count++
      } else {
        // No es evaluable → buscar recursivamente en sus hijos
        count += this.countEvaluableDescendants(child.id, allStandards)
      }
    }

    return count
  }
}
