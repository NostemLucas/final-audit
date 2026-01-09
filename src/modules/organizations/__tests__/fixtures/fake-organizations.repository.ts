import { OrganizationEntity } from '../../entities/organization.entity'
import type { IOrganizationRepository } from '../../repositories'
import type { DeepPartial } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

/**
 * ✅ FAKE ORGANIZATIONS REPOSITORY - Implementación en memoria
 *
 * Ventajas:
 * - Comportamiento REAL (guarda, busca, actualiza datos)
 * - Sin necesidad de mockear función por función
 * - Tests más legibles y mantenibles
 * - Más cercano al comportamiento real de la DB
 *
 * Uso:
 * ```typescript
 * const fakeRepo = new FakeOrganizationsRepository()
 * fakeRepo.seed([TEST_ORGANIZATIONS.ORG_1, TEST_ORGANIZATIONS.ORG_2])
 * const result = await service.findAll()
 * expect(result).toHaveLength(2)
 * ```
 */
export class FakeOrganizationsRepository implements IOrganizationRepository {
  private organizations: Map<string, OrganizationEntity> = new Map()
  private currentId = 1

  /**
   * Limpia todos los datos (útil en beforeEach)
   */
  clear(): void {
    this.organizations.clear()
    this.currentId = 1
  }

  /**
   * Agrega organizaciones de prueba predefinidas
   */
  seed(organizations: OrganizationEntity[]): void {
    organizations.forEach((org) => {
      this.organizations.set(org.id, { ...org })
    })
  }

  // ============================================
  // IBaseRepository Methods
  // ============================================

  create(data: DeepPartial<OrganizationEntity>): OrganizationEntity {
    const org = new OrganizationEntity()
    Object.assign(org, data)
    return org
  }

  createMany(data: DeepPartial<OrganizationEntity>[]): OrganizationEntity[] {
    return data.map((d) => this.create(d))
  }

  async save(
    data: DeepPartial<OrganizationEntity>,
  ): Promise<OrganizationEntity> {
    // Simula generación de ID
    if (!data.id) {
      data.id = `org-${this.currentId++}`
    }

    // Simula timestamps
    const now = new Date()
    if (!data.createdAt) {
      data.createdAt = now
    }
    data.updatedAt = now

    const savedOrg = data as OrganizationEntity
    this.organizations.set(savedOrg.id, { ...savedOrg })
    return { ...savedOrg }
  }

  async saveMany(
    data: DeepPartial<OrganizationEntity>[],
  ): Promise<OrganizationEntity[]> {
    return Promise.all(data.map((d) => this.save(d)))
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const org = this.organizations.get(id)
    return org && !org.deletedAt ? { ...org } : null
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return Array.from(this.organizations.values()).filter((o) => !o.deletedAt)
  }

  async findByIds(ids: string[]): Promise<OrganizationEntity[]> {
    return Array.from(this.organizations.values()).filter(
      (o) => ids.includes(o.id) && !o.deletedAt,
    )
  }

  update(
    id: string,
    partialEntity: QueryDeepPartialEntity<OrganizationEntity>,
  ): Promise<boolean> {
    const org = this.organizations.get(id)
    if (!org || org.deletedAt) {
      return false
    }

    Object.assign(org, partialEntity, { updatedAt: new Date() })
    this.organizations.set(id, org)
    return true
  }

  async patch(
    entity: OrganizationEntity,
    partialEntity: DeepPartial<OrganizationEntity>,
  ): Promise<OrganizationEntity> {
    const updated = { ...entity, ...partialEntity, updatedAt: new Date() }
    this.organizations.set(entity.id, updated)
    return { ...updated }
  }

  async softDelete(id: string): Promise<boolean> {
    const org = this.organizations.get(id)
    if (!org || org.deletedAt) {
      return false
    }

    org.deletedAt = new Date()
    this.organizations.set(id, org)
    return true
  }

  async recover(id: string): Promise<boolean> {
    const org = this.organizations.get(id)
    if (!org) {
      return false
    }

    org.deletedAt = undefined
    this.organizations.set(id, org)
    return true
  }

  // ============================================
  // IOrganizationRepository Specific Methods
  // ============================================

  async findByNit(nit: string): Promise<OrganizationEntity | null> {
    for (const org of this.organizations.values()) {
      if (org.nit === nit && !org.deletedAt) {
        return { ...org }
      }
    }
    return null
  }

  async findByName(name: string): Promise<OrganizationEntity | null> {
    for (const org of this.organizations.values()) {
      if (org.name === name && !org.deletedAt) {
        return { ...org }
      }
    }
    return null
  }

  async findAllActive(): Promise<OrganizationEntity[]> {
    return Array.from(this.organizations.values()).filter(
      (o) => o.isActive && !o.deletedAt,
    )
  }

  async findActiveById(id: string): Promise<OrganizationEntity | null> {
    const org = this.organizations.get(id)
    return org && org.isActive && !org.deletedAt ? { ...org } : null
  }

  async findActiveByNit(nit: string): Promise<OrganizationEntity | null> {
    for (const org of this.organizations.values()) {
      if (org.nit === nit && org.isActive && !org.deletedAt) {
        return { ...org }
      }
    }
    return null
  }

  async countActiveUsers(organizationId: string): Promise<number> {
    // En un fake repo simple, retornamos 0
    // En tests reales, puedes simular conteos específicos
    const org = this.organizations.get(organizationId)
    if (!org) return 0

    // Podrías agregar un campo interno para simular esto
    return (org as any)._activeUsersCount || 0
  }

  async hardDelete(id: string): Promise<void> {
    this.organizations.delete(id)
  }

  // ============================================
  // Helper Methods for Testing
  // ============================================

  /**
   * Obtiene todas las organizaciones (incluyendo eliminadas)
   */
  getAllIncludingDeleted(): OrganizationEntity[] {
    return Array.from(this.organizations.values())
  }

  /**
   * Cuenta organizaciones activas (no eliminadas)
   */
  count(): number {
    return Array.from(this.organizations.values()).filter((o) => !o.deletedAt)
      .length
  }

  /**
   * Cuenta organizaciones activas (isActive = true)
   */
  countActive(): number {
    return Array.from(this.organizations.values()).filter(
      (o) => o.isActive && !o.deletedAt,
    ).length
  }

  /**
   * Simula la cantidad de usuarios activos de una organización
   * Útil para tests de remove() que valida usuarios activos
   */
  setActiveUsersCount(organizationId: string, count: number): void {
    const org = this.organizations.get(organizationId)
    if (org) {
      ;(org as any)._activeUsersCount = count
    }
  }
}
