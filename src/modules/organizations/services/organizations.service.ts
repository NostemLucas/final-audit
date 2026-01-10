import { Injectable } from '@nestjs/common'
import { PaginatedResponse } from '@core/dtos'
import { OrganizationEntity } from '../entities/organization.entity'
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  FindOrganizationsDto,
} from '../dtos'
import {
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  FindOrganizationByNitUseCase,
  FindOrganizationsWithFiltersUseCase,
  UploadLogoUseCase,
  RemoveOrganizationUseCase,
  DeleteOrganizationUseCase,
} from '../use-cases'

/**
 * Servicio de organizaciones - Actúa como fachada para los casos de uso
 *
 * Este servicio delega todas las operaciones a casos de uso específicos,
 * proporcionando una API pública consistente para el controlador.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly findAllOrganizationsUseCase: FindAllOrganizationsUseCase,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
    private readonly findOrganizationByNitUseCase: FindOrganizationByNitUseCase,
    private readonly findOrganizationsWithFiltersUseCase: FindOrganizationsWithFiltersUseCase,
    private readonly uploadLogoUseCase: UploadLogoUseCase,
    private readonly removeOrganizationUseCase: RemoveOrganizationUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  /**
   * Crea una nueva organización
   */
  async create(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    return await this.createOrganizationUseCase.execute(dto)
  }

  /**
   * Lista todas las organizaciones activas
   */
  async findAll(): Promise<OrganizationEntity[]> {
    return await this.findAllOrganizationsUseCase.execute()
  }

  /**
   * Busca organizaciones con paginación y filtros
   */
  async findWithFilters(
    query: FindOrganizationsDto,
  ): Promise<PaginatedResponse<OrganizationEntity>> {
    return await this.findOrganizationsWithFiltersUseCase.execute(query)
  }

  /**
   * Busca una organización activa por ID
   */
  async findOne(id: string): Promise<OrganizationEntity> {
    return await this.findOrganizationByIdUseCase.execute(id)
  }

  /**
   * Busca una organización activa por NIT
   */
  async findByNit(nit: string): Promise<OrganizationEntity> {
    return await this.findOrganizationByNitUseCase.execute(nit)
  }

  /**
   * Actualiza una organización
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    return await this.updateOrganizationUseCase.execute(id, dto)
  }

  /**
   * Sube el logo de la organización
   */
  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<OrganizationEntity> {
    return await this.uploadLogoUseCase.execute(id, file)
  }

  /**
   * Elimina una organización (soft delete)
   */
  async remove(id: string): Promise<void> {
    return await this.removeOrganizationUseCase.execute(id)
  }

  /**
   * Elimina permanentemente una organización (hard delete)
   */
  async delete(id: string): Promise<void> {
    return await this.deleteOrganizationUseCase.execute(id)
  }
}
