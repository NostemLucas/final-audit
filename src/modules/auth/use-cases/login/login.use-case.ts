import { Injectable } from '@nestjs/common'
import { TokensService } from '../../services/tokens.service'
import { ValidateUserUseCase } from '../validate-user/validate-user.use-case'
import type { LoginDto, LoginResponseDto } from '../../dtos'

/**
 * Use Case: Login de usuario
 *
 * Responsabilidades:
 * - Validar credenciales del usuario
 * - Generar par de tokens (access + refresh)
 * - Retornar información del usuario y tokens
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly validateUserUseCase: ValidateUserUseCase,
    private readonly tokensService: TokensService,
  ) {}

  /**
   * Ejecuta el flujo de login
   *
   * @param dto - Credenciales de login
   * @returns Response con access token e info del usuario, más refresh token separado
   */
  async execute(
    dto: LoginDto,
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    // 1. Validar credenciales
    const user = await this.validateUserUseCase.execute(
      dto.usernameOrEmail,
      dto.password,
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
