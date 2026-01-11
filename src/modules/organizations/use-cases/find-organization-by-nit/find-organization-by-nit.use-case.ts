import { Injectable, Inject } from '@nestjs/common'
import { OrganizationEntity } from '../../entities/organization.entity'
import { OrganizationNotFoundException } from '../../exceptions'
import { ORGANIZATION_REPOSITORY } from '../../tokens'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Buscar una organización activa por NIT
 */
@Injectable()
export class FindOrganizationByNitUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(nit: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findActiveByNit(nit)

    if (!organization) {
      throw new OrganizationNotFoundException(nit, 'NIT')
    }

    return organization
  }
}
