import { Injectable, Inject } from '@nestjs/common'
import { OrganizationEntity } from '../entities/organization.entity'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'
import type { IOrganizationRepository } from '../repositories'
import { ORGANIZATION_REPOSITORY } from '../repositories'
import { OrganizationValidator } from '../validators/organization.validator'
import {
  OrganizationNotFoundException,
  OrganizationHasActiveUsersException,
} from '../exceptions'
import { FilesService, FileType } from '@core/files'

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly validator: OrganizationValidator,
    private readonly filesService: FilesService,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationEntity> {
    await this.validator.validateUniqueConstraints(
      createOrganizationDto.name,
      createOrganizationDto.nit,
    )

    const organization = this.organizationRepository.create(
      createOrganizationDto,
    )

    return await this.organizationRepository.save(organization)
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return await this.organizationRepository.findAllActive()
  }

  async findOne(id: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findActiveById(id)

    if (!organization) {
      throw new OrganizationNotFoundException(id)
    }

    return organization
  }

  async findByNit(nit: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findActiveByNit(nit)

    if (!organization) {
      throw new OrganizationNotFoundException(nit, 'NIT')
    }

    return organization
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const organization = await this.findOne(id)

    if (
      updateOrganizationDto.name &&
      updateOrganizationDto.name !== organization.name
    ) {
      await this.validator.validateUniqueName(updateOrganizationDto.name, id)
    }

    if (
      updateOrganizationDto.nit &&
      updateOrganizationDto.nit !== organization.nit
    ) {
      await this.validator.validateUniqueNit(updateOrganizationDto.nit, id)
    }

    Object.assign(organization, updateOrganizationDto)

    return await this.organizationRepository.save(organization)
  }

  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<OrganizationEntity> {
    const organization = await this.findOne(id)

    // Subir nuevo logo usando FilesService
    const uploadResult = await this.filesService.replaceFile(
      organization.logoUrl,
      {
        file,
        folder: 'organizations/logos',
        customFileName: `org-${id}`,
        overwrite: true,
        validationOptions: {
          fileType: FileType.IMAGE,
          maxSize: 5 * 1024 * 1024, // 5MB
          maxWidth: 1024,
          maxHeight: 1024,
        },
      },
    )

    // Actualizar organización con nueva URL
    organization.logoUrl = uploadResult.filePath
    return await this.organizationRepository.save(organization)
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id)

    const activeUsersCount = await this.organizationRepository.countActiveUsers(id)

    if (activeUsersCount > 0) {
      throw new OrganizationHasActiveUsersException()
    }

    organization.isActive = false
    await this.organizationRepository.save(organization)
  }

  async delete(id: string): Promise<void> {
    await this.organizationRepository.hardDelete(id)
  }
}

