import { Injectable, Inject } from '@nestjs/common'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../repositories'
import {
  DuplicateOrganizationNameException,
  DuplicateOrganizationNitException,
} from '../exceptions'

@Injectable()
export class OrganizationValidator {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async validateUniqueNit(nit: string, excludeId?: string): Promise<void> {
    const existing = await this.organizationRepository.findByNit(nit)

    if (existing && existing.id !== excludeId) {
      throw new DuplicateOrganizationNitException(nit)
    }
  }

  async validateUniqueName(name: string, excludeId?: string): Promise<void> {
    const existing = await this.organizationRepository.findByName(name)

    if (existing && existing.id !== excludeId) {
      throw new DuplicateOrganizationNameException(name)
    }
  }

  async validateUniqueConstraints(
    name: string,
    nit: string,
    excludeId?: string,
  ): Promise<void> {
    await Promise.all([
      this.validateUniqueName(name, excludeId),
      this.validateUniqueNit(nit, excludeId),
    ])
  }
}
