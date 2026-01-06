import { Injectable, Inject } from '@nestjs/common'
import { USERS_REPOSITORY } from '../repositories'
import type { IUsersRepository } from '../repositories'
import {
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  CiAlreadyExistsException,
  UserNotFoundException,
} from '../exceptions'

/**
 * Servicio de validación de reglas de negocio para usuarios
 * Siguiendo el patrón del OrganizationValidator
 */
@Injectable()
export class UserValidator {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  /**
   * Valida que el email sea único
   * @param email - Email a validar
   * @param excludeId - ID del usuario a excluir de la validación (para updates)
   * @throws EmailAlreadyExistsException si el email ya existe
   */
  async validateUniqueEmail(email: string, excludeId?: string): Promise<void> {
    const exists = await this.usersRepository.existsByEmail(email, excludeId)
    if (exists) {
      throw new EmailAlreadyExistsException(email)
    }
  }

  /**
   * Valida que el username sea único
   * @param username - Username a validar
   * @param excludeId - ID del usuario a excluir de la validación (para updates)
   * @throws UsernameAlreadyExistsException si el username ya existe
   */
  async validateUniqueUsername(
    username: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.usersRepository.existsByUsername(
      username,
      excludeId,
    )
    if (exists) {
      throw new UsernameAlreadyExistsException(username)
    }
  }

  /**
   * Valida que el CI sea único
   * @param ci - CI a validar
   * @param excludeId - ID del usuario a excluir de la validación (para updates)
   * @throws CiAlreadyExistsException si el CI ya existe
   */
  async validateUniqueCI(ci: string, excludeId?: string): Promise<void> {
    const exists = await this.usersRepository.existsByCI(ci, excludeId)
    if (exists) {
      throw new CiAlreadyExistsException(ci)
    }
  }

  /**
   * Valida todas las constraints únicas en paralelo
   * @param email - Email a validar
   * @param username - Username a validar
   * @param ci - CI a validar
   * @param excludeId - ID del usuario a excluir de la validación (para updates)
   */
  async validateUniqueConstraints(
    email: string,
    username: string,
    ci: string,
    excludeId?: string,
  ): Promise<void> {
    await Promise.all([
      this.validateUniqueEmail(email, excludeId),
      this.validateUniqueUsername(username, excludeId),
      this.validateUniqueCI(ci, excludeId),
    ])
  }

  /**
   * Verifica que un usuario existe o lanza excepción
   * @param userId - ID del usuario a verificar
   * @throws UserNotFoundException si el usuario no existe
   */
  async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      throw new UserNotFoundException(userId)
    }
  }
}
