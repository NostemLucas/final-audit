import { Injectable } from '@nestjs/common'
import { LoginUseCase } from '../use-cases/login/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout/logout.use-case'
import {
  RequestResetPasswordUseCase,
  ResetPasswordUseCase,
} from '../use-cases/password-reset'
import {
  Generate2FACodeUseCase,
  Verify2FACodeUseCase,
  Resend2FACodeUseCase,
} from '../use-cases/two-factor'
import type { LoginDto } from '../dtos'
import type { LoginResponseDto } from '../dtos/login-response.dto'

/**
 * Servicio de autenticación (Facade)
 *
 * Actúa como fachada para los use cases de autenticación
 * Los controllers llaman a este service, que delega a los use cases
 *
 * Este servicio NO contiene lógica de negocio, solo delegación
 */
@Injectable()
export class AuthService {
  constructor(
    // Use cases de login/logout/refresh
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,

    // Use cases de password reset
    private readonly requestResetPasswordUseCase: RequestResetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,

    // Use cases de 2FA
    private readonly generate2FACodeUseCase: Generate2FACodeUseCase,
    private readonly verify2FACodeUseCase: Verify2FACodeUseCase,
    private readonly resend2FACodeUseCase: Resend2FACodeUseCase,
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

  // ========================================
  // Reset Password
  // ========================================

  /**
   * Solicitar reset de contraseña
   *
   * Delega al use case correspondiente
   *
   * @param email - Email del usuario
   * @returns Mensaje de confirmación
   */
  async requestResetPassword(email: string): Promise<{ message: string }> {
    return await this.requestResetPasswordUseCase.execute(email)
  }

  /**
   * Resetear contraseña usando token
   *
   * Delega al use case correspondiente
   *
   * @param token - Token de reset
   * @param newPassword - Nueva contraseña
   * @returns Mensaje de confirmación
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return await this.resetPasswordUseCase.execute(token, newPassword)
  }

  // ========================================
  // Two-Factor Authentication (2FA)
  // ========================================

  /**
   * Generar código 2FA y enviarlo por email
   *
   * Delega al use case correspondiente
   *
   * @param identifier - Email o userId
   * @returns Token JWT y mensaje de confirmación
   */
  async generate2FACode(
    identifier: string,
  ): Promise<{ token: string; message: string }> {
    return await this.generate2FACodeUseCase.execute(identifier)
  }

  /**
   * Verificar código 2FA
   *
   * Delega al use case correspondiente
   *
   * @param userId - ID del usuario
   * @param code - Código numérico
   * @param token - Token JWT opcional
   * @returns Resultado de la validación
   */
  async verify2FACode(
    userId: string,
    code: string,
    token?: string,
  ): Promise<{ valid: boolean; message: string }> {
    return await this.verify2FACodeUseCase.execute(userId, code, token)
  }

  /**
   * Reenviar código 2FA
   *
   * Delega al use case correspondiente
   *
   * @param userId - ID del usuario
   * @returns Nuevo token JWT
   */
  async resend2FACode(
    userId: string,
  ): Promise<{ token: string; message: string }> {
    return await this.resend2FACodeUseCase.execute(userId)
  }
}
