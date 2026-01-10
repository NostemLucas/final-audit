import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { CreateOrganizationDto } from '../../dtos'
import { OrganizationEntity } from '../../entities/organization.entity'
import { OrganizationValidator } from '../../validators/organization.validator'
import { OrganizationFactory } from '../../factories/organization.factory'
import { ORGANIZATION_REPOSITORY } from '../../repositories'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Crear una nueva organización
 *
 * Responsabilidades:
 * - Validar constraints únicas (nombre, NIT)
 * - Crear entidad de organización con datos normalizados
 * - Persistir la organización en la base de datos
 */
@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly validator: OrganizationValidator,
    private readonly organizationFactory: OrganizationFactory,
  ) {}

  @Transactional()
  async execute(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    // 1. Validar constraints únicas en paralelo
    await this.validator.validateUniqueConstraints(dto.name, dto.nit)

    // 2. Crear organización usando factory (normaliza datos)
    const organization = this.organizationFactory.createFromDto(dto)

    // 3. Persistir organización
    return await this.organizationRepository.save(organization)
  }
}
