import { Injectable, Inject } from '@nestjs/common'
import { PasswordHashService } from '@core/security'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'
import { TokensService } from '../../services/tokens.service'
import { LoginRateLimitPolicy } from '../../policies'
import type { LoginDto, LoginResponseDto } from '../../dtos'
import {
  InvalidCredentialsException,
  UserNotActiveException,
} from '../../exceptions'
import { UserStatus } from '../../../users/entities/user.entity'

/**
 * Use Case: Login de usuario
 *
 * Responsabilidades:
 * - Verificar rate limiting (via policy)
 * - Validar credenciales del usuario
 * - Verificar estado activo
 * - Generar par de tokens (access + refresh)
 * - Retornar información del usuario
 *
 * Seguridad:
 * - Rate limiting dual: por IP (10/15min) y por usuario (5/15min)
 * - Incrementa contadores en fallos
 * - Resetea contadores en éxito
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokensService: TokensService,
    private readonly loginRateLimitPolicy: LoginRateLimitPolicy,
  ) {}

  /**
   * Ejecuta el flujo de login completo
   *
   * @param dto - Credenciales de login
   * @param ip - Dirección IP del usuario (para rate limiting)
   * @returns Response con access token e info del usuario, más refresh token separado
   * @throws TooManyAttemptsException si excede intentos
   * @throws InvalidCredentialsException si credenciales inválidas
   * @throws UserNotActiveException si usuario no está activo
   */
  async execute(
    dto: LoginDto,
    ip: string,
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    // 1. Verificar rate limiting (IP y usuario)
    await this.loginRateLimitPolicy.checkLimits(ip, dto.usernameOrEmail)

    // 2. Buscar usuario (por email o username) incluyendo password
    const user = await this.usersRepository.findByUsernameOrEmailWithPassword(
      dto.usernameOrEmail,
    )

    if (!user) {
      // Incrementar contadores y lanzar excepción
      await this.loginRateLimitPolicy.incrementAttempts(ip, dto.usernameOrEmail)
      throw new InvalidCredentialsException()
    }

    // 3. Verificar contraseña
    const isPasswordValid = await this.passwordHashService.verify(
      dto.password,
      user.password,
    )

    if (!isPasswordValid) {
      // Incrementar contadores y lanzar excepción
      await this.loginRateLimitPolicy.incrementAttempts(ip, dto.usernameOrEmail)
      throw new InvalidCredentialsException()
    }

    // 4. Verificar estado activo
    if (user.status !== UserStatus.ACTIVE) {
      throw new UserNotActiveException(user.status)
    }

    // 5. Login exitoso - resetear contadores
    await this.loginRateLimitPolicy.resetAttempts(ip, dto.usernameOrEmail)

    // 6. Generar tokens
    const { accessToken, refreshToken } =
      await this.tokensService.generateTokenPair(user)

    // 7. Construir respuesta (sin password)
    const response: LoginResponseDto = {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: user.roles,
        organizationId: user.organizationId,
        status: user.status,
      },
    }

    return { response, refreshToken }
  }
}
