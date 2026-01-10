import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UpdateOrganizationDto } from '../../dtos'
import { OrganizationEntity } from '../../entities/organization.entity'
import { OrganizationValidator } from '../../validators/organization.validator'
import { OrganizationFactory } from '../../factories/organization.factory'
import { OrganizationNotFoundException } from '../../exceptions'
import { ORGANIZATION_REPOSITORY } from '../../repositories'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Actualizar una organización existente
 *
 * Responsabilidades:
 * - Verificar que la organización existe
 * - Validar constraints únicas solo si cambiaron
 * - Actualizar entidad con datos normalizados
 * - Persistir cambios en la base de datos
 */
@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly validator: OrganizationValidator,
    private readonly organizationFactory: OrganizationFactory,
  ) {}

  @Transactional()
  async execute(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    // 1. Verificar que la organización existe y está activa
    const organization = await this.organizationRepository.findActiveById(id)
    if (!organization) {
      throw new OrganizationNotFoundException(id)
    }

    // 2. Validar solo los campos que cambiaron
    const validations: Promise<void>[] = []

    if (dto.name && dto.name !== organization.name) {
      validations.push(this.validator.validateUniqueName(dto.name, id))
    }

    if (dto.nit && dto.nit !== organization.nit) {
      validations.push(this.validator.validateUniqueNit(dto.nit, id))
    }

    // Ejecutar validaciones en paralelo
    if (validations.length > 0) {
      await Promise.all(validations)
    }

    // 3. Actualizar organización usando factory (normaliza datos)
    const updatedOrganization = this.organizationFactory.updateFromDto(
      organization,
      dto,
    )

    // 4. Persistir cambios
    return await this.organizationRepository.save(updatedOrganization)
  }
}
