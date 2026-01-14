import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { TransactionService, AuditService } from '@core/database'
import { MaturityLevelEntity } from '../entities/maturity-level.entity'
import type { IMaturityLevelsRepository } from './interfaces/maturity-levels-repository.interface'

/**
 * Maturity Levels Repository
 *
 * Repositorio para gestionar niveles de madurez
 * Usa BaseRepository para integración con CLS y transacciones
 */
@Injectable()
export class MaturityLevelsRepository
  extends BaseRepository<MaturityLevelEntity>
  implements IMaturityLevelsRepository
{
  constructor(
    @InjectRepository(MaturityLevelEntity)
    repository: Repository<MaturityLevelEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Obtiene todos los niveles de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Lista de niveles ordenados por orden
   */
  async findByFramework(frameworkId: string): Promise<MaturityLevelEntity[]> {
    return await this.getRepo().find({
      where: { frameworkId },
      order: { order: 'ASC' },
    })
  }

  /**
   * Busca un nivel específico dentro de un framework
   *
   * @param frameworkId - ID del framework
   * @param level - Número del nivel
   * @returns Nivel encontrado o null
   */
  async findByFrameworkAndLevel(
    frameworkId: string,
    level: number,
  ): Promise<MaturityLevelEntity | null> {
    return await this.getRepo().findOne({
      where: { frameworkId, level },
    })
  }

  /**
   * Obtiene el nivel mínimo aceptable de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Nivel mínimo aceptable o null
   */
  async findMinimumAcceptable(
    frameworkId: string,
  ): Promise<MaturityLevelEntity | null> {
    return await this.getRepo().findOne({
      where: { frameworkId, isMinimumAcceptable: true },
    })
  }

  /**
   * Obtiene el nivel objetivo de un framework
   *
   * @param frameworkId - ID del framework
   * @returns Nivel objetivo o null
   */
  async findTarget(frameworkId: string): Promise<MaturityLevelEntity | null> {
    return await this.getRepo().findOne({
      where: { frameworkId, isTarget: true },
    })
  }

  /**
   * Elimina todos los niveles de un framework
   * Usado al actualizar niveles en bulk
   *
   * @param frameworkId - ID del framework
   */
  async deleteByFramework(frameworkId: string): Promise<void> {
    await this.getRepo().delete({ frameworkId })
  }
}
