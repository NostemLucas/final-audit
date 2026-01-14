import { Injectable } from '@nestjs/common'
import { TokensService } from '../../services/tokens.service'
import { ValidateUserUseCase } from '../validate-user/validate-user.use-case'
import type { LoginDto, LoginResponseDto } from '../../dtos'

/**
 * Use Case: Login de usuario CON RATE LIMITING
 *
 * Responsabilidades:
 * - Validar credenciales del usuario (con rate limiting por IP y usuario)
 * - Generar par de tokens (access + refresh)
 * - Retornar información del usuario y tokens
 *
 * Seguridad:
 * - Rate limiting dual: por IP (10/15min) y por usuario (5/15min)
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly validateUserUseCase: ValidateUserUseCase,
    private readonly tokensService: TokensService,
  ) {}

  /**
   * Ejecuta el flujo de login CON RATE LIMITING
   *
   * @param dto - Credenciales de login
   * @param ip - Dirección IP del usuario (para rate limiting)
   * @returns Response con access token e info del usuario, más refresh token separado
   * @throws TooManyAttemptsException si excede intentos
   */
  async execute(
    dto: LoginDto,
    ip: string,
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    // 1. Validar credenciales (con rate limiting por IP y usuario)
    const user = await this.validateUserUseCase.execute(
      dto.usernameOrEmail,
      dto.password,
      ip,
    )

    // 2. Generar tokens
    const { accessToken, refreshToken } =
      await this.tokensService.generateTokenPair(user)

    // 3. Construir respuesta (sin password)
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
