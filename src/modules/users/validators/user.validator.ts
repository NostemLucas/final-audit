import { Injectable, Inject } from '@nestjs/common'
import { USERS_REPOSITORY } from '../tokens'
import type { IUsersRepository } from '../repositories'
import {
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  CiAlreadyExistsException,
  UserNotFoundException,
  OrganizationNotFoundForUserException,
  ExclusiveRoleException,
} from '../exceptions'
import { InvalidRoleException } from '../exceptions/invalid-role.exception'
import { RoleTransitionException } from '../exceptions/role-transition.exception'
import { ORGANIZATION_REPOSITORY } from '../../organizations/tokens'
import type { IOrganizationRepository } from '../../organizations/repositories'
import { Role, UserEntity } from '../entities'

/**
 * Servicio de validación de reglas de negocio para usuarios
 * Siguiendo el patrón del OrganizationValidator
 */
@Injectable()
export class UserValidator {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
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
   * Valida que la organización existe y está activa
   * @param organizationId - ID de la organización a validar
   * @throws OrganizationNotFoundForUserException si la organización no existe o está inactiva
   */
  async validateOrganizationExists(organizationId: string): Promise<void> {
    const exists =
      await this.organizationRepository.existsActiveById(organizationId)

    if (!exists) {
      throw new OrganizationNotFoundForUserException(organizationId)
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

  /**
   * Valida que los roles sean válidos y cumplan las reglas de negocio
   *
   * Reglas:
   * 1. Todos los roles deben ser valores válidos del enum Role
   * 2. El rol CLIENTE no puede combinarse con otros roles (exclusivo)
   *
   * @param roles - Array de roles a validar
   * @throws InvalidRoleException si algún rol no es válido
   * @throws ExclusiveRoleException si CLIENTE está combinado con otros roles
   */
  validateRoles(roles: Role[]): void {
    // Validar que todos los roles sean valores válidos del enum
    const validRoles = Object.values(Role)
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        throw new InvalidRoleException(role)
      }
    }

    // Validar exclusividad del rol CLIENTE
    if (roles.includes(Role.CLIENTE) && roles.length > 1) {
      throw new ExclusiveRoleException()
    }
  }

  /**
   * Valida la transición de roles al actualizar un usuario
   *
   * Regla de negocio CRÍTICA:
   * - Si un usuario tiene rol CLIENTE, NO puede cambiar a otro rol
   * - Esta es una restricción permanente por motivos de seguridad y auditoría
   * - Si se necesita un usuario con otro rol, debe crearse uno nuevo
   *
   * @param currentUser - Usuario actual con sus roles actuales
   * @param newRoles - Nuevos roles que se quieren asignar
   * @throws RoleTransitionException si se intenta cambiar desde CLIENTE
   */
  validateRoleTransition(currentUser: UserEntity, newRoles: Role[]): void {
    // Si el usuario actual tiene rol CLIENTE
    const wasCliente = currentUser.roles.includes(Role.CLIENTE)

    // Y los nuevos roles NO incluyen CLIENTE (intento de cambio)
    const isChangingFromCliente = wasCliente && !newRoles.includes(Role.CLIENTE)

    if (isChangingFromCliente) {
      throw new RoleTransitionException()
    }
  }
}
