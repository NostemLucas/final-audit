import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database/transactional.decorator'
import { TemplatesRepository } from '../../repositories/templates.repository'
import { TemplateAlreadyExistsException } from '../../exceptions'
import { TemplateStatus } from '../../constants/template-status.enum'
import type { CreateTemplateDto } from './create-template.dto'
import type { TemplateEntity } from '../../entities/template.entity'

/**
 * Create Template Use Case
 *
 * Crea una nueva plantilla de auditoría
 *
 * Reglas de negocio:
 * - La combinación nombre + versión debe ser única
 * - El template se crea en estado draft por defecto
 */
@Injectable()
export class CreateTemplateUseCase {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  /**
   * Ejecuta la creación del template
   *
   * @param dto - Datos del template a crear
   * @returns Template creado
   * @throws {TemplateAlreadyExistsException} Si ya existe un template con ese nombre y versión
   */
  @Transactional()
  async execute(dto: CreateTemplateDto): Promise<TemplateEntity> {
    // 1. Verificar que no exista un template con ese nombre y versión
    const existingTemplate = await this.templatesRepository.findByNameAndVersion(
      dto.name,
      dto.version,
    )

    if (existingTemplate) {
      throw new TemplateAlreadyExistsException(dto.name, dto.version)
    }

    // 2. Crear el template
    const template = await this.templatesRepository.save({
      name: dto.name,
      description: dto.description ?? null,
      version: dto.version,
      status: dto.status ?? TemplateStatus.DRAFT,
    })

    return template
  }
}
