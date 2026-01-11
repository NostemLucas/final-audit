import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { ORGANIZATION_REPOSITORY } from '../../tokens'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Eliminar permanentemente una organización (hard delete)
 *
 * PRECAUCIÓN: Esta operación es irreversible
 *
 * Responsabilidades:
 * - Eliminar permanentemente la organización de la base de datos
 */
@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  @Transactional()
  async execute(id: string): Promise<void> {
    await this.organizationRepository.hardDelete(id)
  }
}
