import { Injectable, Inject } from '@nestjs/common'
import { OrganizationEntity } from '../../entities/organization.entity'
import { OrganizationNotFoundException } from '../../exceptions'
import { ORGANIZATION_REPOSITORY } from '../../tokens'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Buscar una organización activa por ID
 */
@Injectable()
export class FindOrganizationByIdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(id: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findActiveById(id)

    if (!organization) {
      throw new OrganizationNotFoundException(id)
    }

    return organization
  }
}
