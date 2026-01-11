import { Injectable, Inject } from '@nestjs/common'
import { OrganizationEntity } from '../../entities/organization.entity'
import { ORGANIZATION_REPOSITORY } from '../../tokens'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Obtener todas las organizaciones activas
 */
@Injectable()
export class FindAllOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(): Promise<OrganizationEntity[]> {
    return await this.organizationRepository.findAllActive()
  }
}
