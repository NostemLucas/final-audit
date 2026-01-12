import { Injectable, Inject } from '@nestjs/common'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'
import { UserFactory } from '../../../users/factories/user.factory'
import { UserEntity, UserStatus } from '../../../users/entities/user.entity'
import {
  InvalidCredentialsException,
  UserNotActiveException,
} from '../../exceptions'

/**
 * Use Case: Validar credenciales de usuario
 *
 * Responsabilidades:
 * - Buscar usuario por email o username
 * - Verificar contraseña
 * - Verificar que el usuario esté activo
 *
 * Usado por LocalStrategy en el flujo de login
 */
@Injectable()
export class ValidateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly userFactory: UserFactory,
  ) {}

  /**
   * Valida las credenciales de un usuario
   *
   * @param usernameOrEmail - Email o username del usuario
   * @param password - Contraseña en texto plano
   * @returns Entidad del usuario validado
   * @throws InvalidCredentialsException si las credenciales son inválidas
   * @throws UserNotActiveException si el usuario no está activo
   */
  async execute(
    usernameOrEmail: string,
    password: string,
  ): Promise<UserEntity> {
    // 1. Buscar usuario (por email o username) incluyendo password
    const user =
      await this.usersRepository.findByUsernameOrEmailWithPassword(
        usernameOrEmail,
      )

    if (!user) {
      throw new InvalidCredentialsException()
    }

    // 2. Verificar contraseña
    const isPasswordValid = this.userFactory.verifyPassword(
      password,
      user.password,
    )

    if (!isPasswordValid) {
      throw new InvalidCredentialsException()
    }

    // 3. Verificar estado activo
    if (user.status !== UserStatus.ACTIVE) {
      throw new UserNotActiveException(user.status)
    }

    return user
  }
}
