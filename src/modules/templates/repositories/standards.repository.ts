import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { TransactionService, AuditService } from '@core/database'
import { StandardEntity } from '../entities/standard.entity'
import type { IStandardsRepository } from './interfaces/standards-repository.interface'

/**
 * Standards Repository
 *
 * Repositorio para gestionar standards/controles de templates
 * Usa BaseRepository para integración con CLS y transacciones
 */
@Injectable()
export class StandardsRepository
  extends BaseRepository<StandardEntity>
  implements IStandardsRepository
{
  constructor(
    @InjectRepository(StandardEntity)
    repository: Repository<StandardEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Obtiene todos los standards de un template
   *
   * @param templateId - ID del template
   * @returns Lista de standards ordenados por order
   */
  async findByTemplate(templateId: string): Promise<StandardEntity[]> {
    return await this.getRepo().find({
      where: { templateId },
      relations: ['parent', 'children'],
      order: { order: 'ASC' },
    })
  }

  /**
   * Obtiene los standards raíz (sin padre) de un template
   *
   * @param templateId - ID del template
   * @returns Lista de standards raíz ordenados por order
   */
  async findRootByTemplate(templateId: string): Promise<StandardEntity[]> {
    return await this.getRepo().find({
      where: { templateId, parentId: IsNull() },
      relations: ['children'],
      order: { order: 'ASC' },
    })
  }

  /**
   * Obtiene los hijos directos de un standard
   *
   * @param parentId - ID del standard padre
   * @returns Lista de standards hijos ordenados por order
   */
  async findChildren(parentId: string): Promise<StandardEntity[]> {
    return await this.getRepo().find({
      where: { parentId },
      relations: ['children'],
      order: { order: 'ASC' },
    })
  }

  /**
   * Obtiene solo los standards auditables y activos de un template
   *
   * @param templateId - ID del template
   * @returns Lista de standards auditables
   */
  async findAuditableByTemplate(templateId: string): Promise<StandardEntity[]> {
    return await this.getRepo().find({
      where: {
        templateId,
        isAuditable: true,
        isActive: true,
      },
      order: { order: 'ASC' },
    })
  }

  /**
   * Busca un standard por código dentro de un template
   *
   * @param templateId - ID del template
   * @param code - Código del standard
   * @returns Standard encontrado o null
   */
  async findByCode(
    templateId: string,
    code: string,
  ): Promise<StandardEntity | null> {
    return await this.getRepo().findOne({
      where: { templateId, code },
    })
  }

  /**
   * Obtiene un standard con sus relaciones completas
   *
   * @param id - ID del standard
   * @returns Standard con relaciones o null
   */
  async findOneWithRelations(id: string): Promise<StandardEntity | null> {
    return await this.getRepo().findOne({
      where: { id },
      relations: ['template', 'parent', 'children'],
    })
  }

  /**
   * Desactiva un standard
   *
   * @param id - ID del standard
   * @returns Standard desactivado o null si no existe
   */
  async deactivate(id: string): Promise<StandardEntity | null> {
    const standard = await this.findById(id)
    if (!standard) {
      return null
    }
    standard.isActive = false
    return await this.getRepo().save(standard)
  }

  /**
   * Activa un standard
   *
   * @param id - ID del standard
   * @returns Standard activado o null si no existe
   */
  async activate(id: string): Promise<StandardEntity | null> {
    const standard = await this.findById(id)
    if (!standard) {
      return null
    }
    standard.isActive = true
    return await this.getRepo().save(standard)
  }

  /**
   * Cuenta los hijos de un standard
   *
   * @param parentId - ID del standard padre
   * @returns Número de hijos
   */
  async countChildren(parentId: string): Promise<number> {
    return await this.getRepo().count({
      where: { parentId },
    })
  }
}
