import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { TransactionService } from '@core/database'
import { TemplateEntity } from '../entities/template.entity'
import { TemplateStatus } from '../constants/template-status.enum'
import type { ITemplatesRepository } from './interfaces/templates-repository.interface'

/**
 * Templates Repository
 *
 * Repositorio para gestionar templates de auditoría
 * Usa BaseRepository para integración con CLS y transacciones
 */
@Injectable()
export class TemplatesRepository
  extends BaseRepository<TemplateEntity>
  implements ITemplatesRepository
{
  constructor(
    @InjectRepository(TemplateEntity)
    repository: Repository<TemplateEntity>,
    transactionService: TransactionService,
  ) {
    super(repository, transactionService)
  }

  /**
   * Busca un template por nombre y versión
   *
   * @param name - Nombre del template
   * @param version - Versión del template
   * @returns Template encontrado o null
   */
  async findByNameAndVersion(
    name: string,
    version: string,
  ): Promise<TemplateEntity | null> {
    return await this.getRepo().findOne({
      where: { name, version },
    })
  }

  /**
   * Obtiene todos los templates con un status específico
   *
   * @param status - Status del template
   * @returns Lista de templates
   */
  async findByStatus(status: TemplateStatus): Promise<TemplateEntity[]> {
    return await this.getRepo().find({
      where: { status },
      order: { name: 'ASC', version: 'DESC' },
    })
  }

  /**
   * Obtiene todos los templates publicados (usables)
   *
   * @returns Lista de templates publicados
   */
  async findPublished(): Promise<TemplateEntity[]> {
    return await this.findByStatus(TemplateStatus.PUBLISHED)
  }

  /**
   * Obtiene un template con sus standards
   *
   * @param id - ID del template
   * @returns Template con standards o null
   */
  async findOneWithStandards(id: string): Promise<TemplateEntity | null> {
    return await this.getRepo().findOne({
      where: { id },
      relations: ['standards'],
      order: {
        standards: {
          order: 'ASC',
        },
      },
    })
  }

  /**
   * Cambia el status de un template
   *
   * @param id - ID del template
   * @param status - Nuevo status
   * @returns Template actualizado o null si no existe
   */
  async updateStatus(
    id: string,
    status: TemplateStatus,
  ): Promise<TemplateEntity | null> {
    const template = await this.findById(id)
    if (!template) {
      return null
    }
    template.status = status
    return await this.getRepo().save(template)
  }

  /**
   * Obtiene todas las versiones de un template
   *
   * @param name - Nombre del template
   * @returns Lista de versiones ordenadas (más reciente primero)
   */
  async findVersionsByName(name: string): Promise<TemplateEntity[]> {
    return await this.getRepo().find({
      where: { name },
      order: { version: 'DESC' },
    })
  }

  /**
   * Obtiene la última versión de un template
   *
   * @param name - Nombre del template
   * @returns Template de la última versión o null
   */
  async findLatestVersion(name: string): Promise<TemplateEntity | null> {
    const versions = await this.findVersionsByName(name)
    return versions[0] || null
  }
}
