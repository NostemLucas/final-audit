import { Injectable } from '@nestjs/common'
import { LoginUseCase } from '../use-cases/login/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout/logout.use-case'
import type { LoginDto } from '../dtos'
import type { LoginResponseDto } from '../dtos/login-response.dto'

/**
 * Servicio de autenticación (Facade)
 *
 * Actúa como fachada para los use cases de autenticación
 * Los controllers llaman a este service, que delega a los use cases
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  /**
   * Autenticar usuario con credenciales
   *
   * @param dto - Credenciales de login (usernameOrEmail + password)
   * @returns Token de acceso, información del usuario y refresh token
   */
  async login(
    dto: LoginDto,
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    return await this.loginUseCase.execute(dto)
  }

  /**
   * Renovar tokens usando refresh token
   *
   * @param oldRefreshToken - Refresh token actual (será revocado)
   * @returns Nuevos tokens (access + refresh)
   */
  async refreshToken(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return await this.refreshTokenUseCase.execute(oldRefreshToken)
  }

  /**
   * Cerrar sesión del usuario
   *
   * @param userId - ID del usuario
   * @param accessToken - Access token a blacklistear
   * @param refreshToken - Refresh token a revocar (opcional)
   */
  async logout(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    await this.logoutUseCase.execute(userId, accessToken, refreshToken)
  }
}
