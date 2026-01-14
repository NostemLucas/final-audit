import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { TransactionService, AuditService } from '@core/database'
import { MaturityFrameworkEntity } from '../entities/maturity-framework.entity'
import type { IMaturityFrameworksRepository } from './interfaces/maturity-frameworks-repository.interface'

/**
 * Maturity Frameworks Repository
 *
 * Repositorio para gestionar frameworks de madurez
 * Usa BaseRepository para integración con CLS y transacciones
 */
@Injectable()
export class MaturityFrameworksRepository
  extends BaseRepository<MaturityFrameworkEntity>
  implements IMaturityFrameworksRepository
{
  constructor(
    @InjectRepository(MaturityFrameworkEntity)
    repository: Repository<MaturityFrameworkEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  /**
   * Busca un framework por su código único
   *
   * @param code - Código del framework (ej: 'cobit5', 'cmmi')
   * @returns Framework encontrado o null
   */
  async findByCode(code: string): Promise<MaturityFrameworkEntity | null> {
    return await this.getRepo().findOne({
      where: { code },
    })
  }

  /**
   * Obtiene todos los frameworks activos
   *
   * @returns Lista de frameworks activos ordenados por nombre
   */
  async findActive(): Promise<MaturityFrameworkEntity[]> {
    return await this.getRepo().find({
      where: { isActive: true },
      order: { name: 'ASC' },
    })
  }

  /**
   * Obtiene un framework con sus niveles
   *
   * @param id - ID del framework
   * @returns Framework con niveles ordenados o null
   */
  async findOneWithLevels(
    id: string,
  ): Promise<MaturityFrameworkEntity | null> {
    return await this.getRepo().findOne({
      where: { id },
      relations: ['levels'],
      order: {
        levels: {
          order: 'ASC',
        },
      },
    })
  }

  /**
   * Cambia el estado activo de un framework
   *
   * @param id - ID del framework
   * @param isActive - Nuevo estado
   * @returns Framework actualizado o null si no existe
   */
  async updateActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<MaturityFrameworkEntity | null> {
    const framework = await this.findById(id)
    if (!framework) {
      return null
    }
    framework.isActive = isActive
    return await this.getRepo().save(framework)
  }
}
