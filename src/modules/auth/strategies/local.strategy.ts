import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { ValidateUserUseCase } from '../use-cases/validate-user/validate-user.use-case'
import type { UserEntity } from '../../users/entities/user.entity'

/**
 * Local Strategy (Passport)
 *
 * Maneja la autenticación con username/password
 * Usado en el endpoint de login
 *
 * @see ValidateUserUseCase
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly validateUserUseCase: ValidateUserUseCase) {
    super({
      usernameField: 'usernameOrEmail', // Campo del DTO
      passwordField: 'password',
    })
  }

  /**
   * Valida las credenciales del usuario
   *
   * Este método es llamado automáticamente por Passport
   * cuando se usa el LocalAuthGuard
   *
   * @param usernameOrEmail - Email o username
   * @param password - Contraseña en texto plano
   * @returns Usuario validado
   */
  async validate(
    usernameOrEmail: string,
    password: string,
  ): Promise<UserEntity> {
    return await this.validateUserUseCase.execute(usernameOrEmail, password)
  }
}
