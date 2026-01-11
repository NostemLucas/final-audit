import { Injectable, Inject } from '@nestjs/common'
import { Transactional } from '@core/database'
import { FilesService, FileType } from '@core/files'
import { OrganizationEntity } from '../../entities/organization.entity'
import { OrganizationNotFoundException } from '../../exceptions'
import { ORGANIZATION_REPOSITORY } from '../../tokens'
import type { IOrganizationRepository } from '../../repositories'

/**
 * Caso de uso: Subir logo de organización
 *
 * Responsabilidades:
 * - Verificar que la organización existe
 * - Reemplazar logo anterior si existe
 * - Validar formato y tamaño de imagen
 * - Actualizar URL de logo en organización
 */
@Injectable()
export class UploadLogoUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    private readonly filesService: FilesService,
  ) {}

  @Transactional()
  async execute(
    id: string,
    file: Express.Multer.File,
  ): Promise<OrganizationEntity> {
    // 1. Verificar que la organización existe y está activa
    const organization = await this.organizationRepository.findActiveById(id)
    if (!organization) {
      throw new OrganizationNotFoundException(id)
    }

    // 2. Subir nuevo logo (reemplaza el anterior si existe)
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

    // 3. Actualizar organización con nueva URL
    organization.logoUrl = uploadResult.filePath
    return await this.organizationRepository.save(organization)
  }
}
