import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TransactionService, AuditService } from '@core/database'
import { BaseRepository } from '@core/repositories/base.repository'
import { UserEntity } from '../entities/user.entity'
import { IUsersRepository } from './users-repository.interface'

@Injectable()
export class UsersRepository
  extends BaseRepository<UserEntity>
  implements IUsersRepository
{
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { email: email.toLowerCase() },
      relations: ['organization'],
    })
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { username: username.toLowerCase() },
      relations: ['organization'],
    })
  }

  /**
   * Busca un usuario por email o username e incluye el password
   * Usado para autenticación
   *
   * @param usernameOrEmail - Email o username (case-insensitive)
   * @returns Usuario con password, o null si no existe
   */
  async findByUsernameOrEmailWithPassword(
    usernameOrEmail: string,
  ): Promise<UserEntity | null> {
    const normalized = usernameOrEmail.toLowerCase()

    return await this.getRepo()
      .createQueryBuilder('user')
      .addSelect('user.password') // Incluir password explícitamente
      .where('LOWER(user.email) = :identifier', { identifier: normalized })
      .orWhere('LOWER(user.username) = :identifier', { identifier: normalized })
      .getOne()
  }

  async findByCI(ci: string): Promise<UserEntity | null> {
    return await this.getRepo().findOne({
      where: { ci },
      relations: ['organization'],
    })
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return await this.getRepo().find({
      where: { organizationId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    })
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.email = :email', {
        email: email.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.username = :username', {
        username: username.toLowerCase(),
      })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async existsByCI(ci: string, excludeId?: string): Promise<boolean> {
    const query = this.getRepo()
      .createQueryBuilder('user')
      .where('user.ci = :ci', { ci })

    if (excludeId) {
      query.andWhere('user.id != :id', { id: excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  async countUsersByOrganization(organizationId: string): Promise<number> {
    return await this.getRepo().count({
      where: { organizationId },
    })
  }
}
