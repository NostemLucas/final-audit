import { Injectable, Inject } from '@nestjs/common'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'
import { PasswordHashService, RateLimitService } from '@core/security'
import { UserEntity, UserStatus } from '../../../users/entities/user.entity'
import {
  InvalidCredentialsException,
  UserNotActiveException,
  TooManyAttemptsException,
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
  private readonly maxAttemptsByIp = 10 // Máximo 10 intentos por IP
  private readonly maxAttemptsByUser = 5 // Máximo 5 intentos por usuario
  private readonly attemptsWindow = 15 // Ventana de 15 minutos

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  /**
   * Valida las credenciales de un usuario CON RATE LIMITING
   *
   * Protección contra fuerza bruta con dos niveles:
   * - Por IP: Previene ataques distribuidos desde una IP (10 intentos en 15 min)
   * - Por usuario: Previene ataques dirigidos a una cuenta (5 intentos en 15 min)
   *
   * @param usernameOrEmail - Email o username del usuario
   * @param password - Contraseña en texto plano
   * @param ip - Dirección IP del usuario (para rate limiting)
   * @returns Entidad del usuario validado
   * @throws InvalidCredentialsException si las credenciales son inválidas
   * @throws UserNotActiveException si el usuario no está activo
   * @throws TooManyAttemptsException si excede intentos
   */
  async execute(
    usernameOrEmail: string,
    password: string,
    ip: string,
  ): Promise<UserEntity> {
    // 1. Verificar rate limiting por IP
    const rateLimitKeyIp = `login:attempts:ip:${ip}`
    const canAttemptByIp = await this.rateLimitService.checkLimit(
      rateLimitKeyIp,
      this.maxAttemptsByIp,
      this.attemptsWindow,
    )

    if (!canAttemptByIp) {
      const remaining = await this.rateLimitService.getTimeUntilReset(
        rateLimitKeyIp,
      )
      throw new TooManyAttemptsException(
        `Demasiados intentos desde esta IP. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }

    // 2. Verificar rate limiting por usuario
    const userIdentifier = usernameOrEmail.toLowerCase()
    const rateLimitKeyUser = `login:attempts:user:${userIdentifier}`
    const canAttemptByUser = await this.rateLimitService.checkLimit(
      rateLimitKeyUser,
      this.maxAttemptsByUser,
      this.attemptsWindow,
    )

    if (!canAttemptByUser) {
      const remaining = await this.rateLimitService.getTimeUntilReset(
        rateLimitKeyUser,
      )
      throw new TooManyAttemptsException(
        `Demasiados intentos fallidos para este usuario. Intenta de nuevo en ${Math.ceil(remaining / 60)} minutos.`,
      )
    }

    // 3. Buscar usuario (por email o username) incluyendo password
    const user =
      await this.usersRepository.findByUsernameOrEmailWithPassword(
        usernameOrEmail,
      )

    if (!user) {
      // Incrementar ambos contadores
      await this.rateLimitService.incrementAttempts(
        rateLimitKeyIp,
        this.attemptsWindow,
      )
      await this.rateLimitService.incrementAttempts(
        rateLimitKeyUser,
        this.attemptsWindow,
      )
      throw new InvalidCredentialsException()
    }

    // 4. Verificar contraseña
    const isPasswordValid = await this.passwordHashService.verify(
      password,
      user.password,
    )

    if (!isPasswordValid) {
      // Incrementar ambos contadores
      await this.rateLimitService.incrementAttempts(
        rateLimitKeyIp,
        this.attemptsWindow,
      )
      await this.rateLimitService.incrementAttempts(
        rateLimitKeyUser,
        this.attemptsWindow,
      )
      throw new InvalidCredentialsException()
    }

    // 5. Verificar estado activo
    if (user.status !== UserStatus.ACTIVE) {
      throw new UserNotActiveException(user.status)
    }

    // 6. Login exitoso - resetear ambos contadores
    await this.rateLimitService.resetAttempts(rateLimitKeyIp)
    await this.rateLimitService.resetAttempts(rateLimitKeyUser)

    return user
  }
}
