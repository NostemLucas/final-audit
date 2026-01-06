import { IBaseRepository } from '@core/repositories/base-repository.interface'
import { UserEntity } from '../entities/user.entity'

export interface IUsersRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  findByCI(ci: string): Promise<UserEntity | null>
  findByOrganization(organizationId: string): Promise<UserEntity[]>
  existsByEmail(email: string, excludeId?: string): Promise<boolean>
  existsByUsername(username: string, excludeId?: string): Promise<boolean>
  existsByCI(ci: string, excludeId?: string): Promise<boolean>
}
