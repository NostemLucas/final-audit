import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { User } from './user.entity'
import { ClsService } from 'nestjs-cls'

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    cls: ClsService,
  ) {
    super(repository, cls)
  }

  /**
   * Buscar usuario por email
   * Automáticamente usa la transacción de CLS si existe
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.getRepo().findOne({
      where: { email },
    })
  }

  /**
   * Ejemplo de método personalizado que usa CLS automáticamente
   */
  async findActiveUsers(): Promise<User[]> {
    // getRepo() obtiene automáticamente el EntityManager de CLS
    // si hay una transacción activa
    return await this.getRepo()
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .getMany()
  }

  /**
   * Actualizar email del usuario
   */
  async updateEmail(userId: string, newEmail: string): Promise<boolean> {
    const result = await this.getRepo().update(userId, {
      email: newEmail,
    })
    return (result.affected ?? 0) > 0
  }
}
