import { Injectable } from '@nestjs/common'
import { OrganizationEntity } from '../entities/organization.entity'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'

/**
 * Factory para crear y actualizar entidades de Organization
 * Centraliza la lógica de normalización y transformación de datos
 */
@Injectable()
export class OrganizationFactory {
  /**
   * Crea una nueva entidad OrganizationEntity desde un CreateOrganizationDto
   * Aplica normalizaciones y transformaciones necesarias
   *
   * @param dto - Datos de la organización a crear
   * @returns Nueva instancia de OrganizationEntity (sin persistir)
   */
  createFromDto(dto: CreateOrganizationDto): OrganizationEntity {
    const organization = new OrganizationEntity()

    organization.name = this.normalizeName(dto.name)
    organization.nit = this.normalizeNIT(dto.nit)
    organization.description = dto.description?.trim() || null
    organization.address = dto.address?.trim() || null
    organization.phone = dto.phone?.trim() || null
    organization.email = dto.email ? dto.email.toLowerCase().trim() : null
    organization.logoUrl = null
    organization.isActive = true

    return organization
  }

  /**
   * Actualiza una entidad OrganizationEntity existente desde un UpdateOrganizationDto
   * Solo actualiza los campos proporcionados en el DTO
   *
   * @param organization - Entidad de organización existente
   * @param dto - Datos a actualizar
   * @returns La entidad actualizada (misma referencia)
   */
  updateFromDto(
    organization: OrganizationEntity,
    dto: UpdateOrganizationDto,
  ): OrganizationEntity {
    if (dto.name !== undefined) {
      organization.name = this.normalizeName(dto.name)
    }

    if (dto.nit !== undefined) {
      organization.nit = this.normalizeNIT(dto.nit)
    }

    if (dto.description !== undefined) {
      organization.description = dto.description?.trim() || null
    }

    if (dto.address !== undefined) {
      organization.address = dto.address?.trim() || null
    }

    if (dto.phone !== undefined) {
      organization.phone = dto.phone?.trim() || null
    }

    if (dto.email !== undefined) {
      organization.email = dto.email ? dto.email.toLowerCase().trim() : null
    }

    return organization
  }

  /**
   * Normaliza el nombre de la organización
   * - Elimina espacios extras al inicio/final
   * - Convierte múltiples espacios internos en uno solo
   * - Capitaliza primera letra de cada palabra
   *
   * @param name - Nombre a normalizar
   * @returns Nombre normalizado
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios → un espacio
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Normaliza el NIT (Número de Identificación Tributaria)
   * - Elimina espacios
   * - Convierte a mayúsculas
   * - Mantiene solo números, letras y guiones
   *
   * @param nit - NIT a normalizar
   * @returns NIT normalizado
   */
  private normalizeNIT(nit: string): string {
    return nit
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '') // Elimina espacios
      .replace(/[^0-9A-Z-]/g, '') // Solo números, letras y guiones
  }
}
