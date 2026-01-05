import { IBaseRepository } from "@core/repositories";
import { OrganizationEntity } from "../entities";

export interface IOrganizationRepository extends IBaseRepository<OrganizationEntity>{
  findByNit(nit: string): Promise<OrganizationEntity | null>
  findByName(name: string): Promise<OrganizationEntity | null>
  findAllActive(): Promise<OrganizationEntity[]>
  findActiveById(id: string): Promise<OrganizationEntity | null>
  findActiveByNit(nit: string): Promise<OrganizationEntity | null>
  countActiveUsers(organizationId: string): Promise<number>
  hardDelete(id: string): Promise<void>
} 