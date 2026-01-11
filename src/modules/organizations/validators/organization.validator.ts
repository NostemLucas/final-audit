import { Injectable, Inject } from '@nestjs/common'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../tokens'
import {
  NameAlreadyExistsException,
  NitAlreadyExistsException,
  OrganizationHasActiveUsersException,
  OrganizationNotFoundException,
} from '../exceptions'
import { USERS_REPOSITORY } from '../../users/tokens'
import type { IUsersRepository } from '../../users/repositories'

@Injectable()
export class OrganizationValidator {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(USERS_REPOSITORY)
    private readonly userRepository: IUsersRepository,
  ) {}

  async validateUniqueNit(nit: string, excludeId?: string): Promise<void> {
    const existing = await this.organizationRepository.findByNit(nit)

    if (existing && existing.id !== excludeId) {
      throw new NitAlreadyExistsException(nit)
    }
  }

  async validateUniqueName(name: string, excludeId?: string): Promise<void> {
    const existing = await this.organizationRepository.findByName(name)

    if (existing && existing.id !== excludeId) {
      throw new NameAlreadyExistsException(name)
    }
  }

  async ensureOrganizationExists(organizationId: string): Promise<void> {
    const organization =
      await this.organizationRepository.findById(organizationId)
    if (!organization) {
      throw new OrganizationNotFoundException(organizationId)
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

  async validateCanBeDeactivated(organizationId: string): Promise<void> {
    const activeUsersCount =
      await this.userRepository.countUsersByOrganization(organizationId)

    if (activeUsersCount > 0) {
      throw new OrganizationHasActiveUsersException()
    }
  }
}
