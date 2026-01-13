import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { LoginUseCase } from '../use-cases/login/login.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '../use-cases/logout/logout.use-case'
import type { LoginDto } from '../dtos'
import type { LoginResponseDto } from '../dtos/login-response.dto'
import { ResetPasswordTokenService } from './reset-password-token.service'
import { TwoFactorTokenService } from './two-factor-token.service'
import { UsersRepository } from '../../users/repositories/users.repository'
import { EmailService } from '@core/email'
import * as bcrypt from 'bcrypt'

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
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
    private readonly twoFactorTokenService: TwoFactorTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
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
   * 1. Verifica que el email existe
   * 2. Genera token de reset (JWT + Redis)
   * 3. Envía email con link de reset
   *
   * @param email - Email del usuario
   * @returns Mensaje de confirmación
   */
  async requestResetPassword(email: string): Promise<{ message: string }> {
    // Buscar usuario por email
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        message:
          'Si el email existe, recibirás un link para resetear tu contraseña',
      }
    }

    // Generar token de reset
    const token = await this.resetPasswordTokenService.generateToken(user.id)

    // Construir URL de reset (frontend)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    // Enviar email
    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.username,
      resetLink,
      expiresInMinutes: 60, // 1 hora
    })

    return {
      message:
        'Si el email existe, recibirás un link para resetear tu contraseña',
    }
  }

  /**
   * Resetear contraseña usando token
   *
   * 1. Valida el token (JWT + Redis)
   * 2. Actualiza la contraseña
   * 3. Revoca el token y todos los refresh tokens del usuario
   *
   * @param token - Token de reset
   * @param newPassword - Nueva contraseña
   * @returns Mensaje de confirmación
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Validar token
    const userId = await this.resetPasswordTokenService.validateToken(token)

    if (!userId) {
      throw new BadRequestException('Token inválido o expirado')
    }

    // Buscar usuario
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar contraseña
    await this.usersRepository.update(user.id, { password: hashedPassword })

    // Revocar token usado
    await this.resetPasswordTokenService.revokeToken(token)

    // Revocar todos los refresh tokens (seguridad: cerrar todas las sesiones)
    await this.resetPasswordTokenService.revokeUserTokens(userId)

    return {
      message: 'Contraseña actualizada exitosamente',
    }
  }

  // ========================================
  // Two-Factor Authentication (2FA)
  // ========================================

  /**
   * Generar código 2FA y enviarlo por email
   *
   * 1. Verifica que el usuario existe
   * 2. Genera código numérico (6 dígitos)
   * 3. Almacena en Redis con TTL
   * 4. Envía email con el código
   * 5. Devuelve token JWT para validación
   *
   * @param identifier - Email o userId
   * @returns Token JWT y mensaje de confirmación
   */
  async generate2FACode(
    identifier: string,
  ): Promise<{ token: string; message: string }> {
    // Buscar usuario por email o ID
    let user = await this.usersRepository.findByEmail(identifier)

    if (!user) {
      user = await this.usersRepository.findById(identifier)
    }

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Generar código 2FA
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5, // 5 minutos
    })

    return {
      token,
      message: 'Código 2FA enviado al email registrado',
    }
  }

  /**
   * Verificar código 2FA
   *
   * 1. Valida el código contra Redis
   * 2. Valida el JWT (opcional)
   * 3. Elimina el código de Redis (un solo uso)
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
    // Validar código
    const isValid = await this.twoFactorTokenService.validateCode(
      userId,
      code,
      token,
    )

    if (!isValid) {
      return {
        valid: false,
        message: 'Código inválido o expirado',
      }
    }

    return {
      valid: true,
      message: 'Código verificado exitosamente',
    }
  }

  /**
   * Reenviar código 2FA
   *
   * 1. Revoca código anterior (si existe)
   * 2. Genera nuevo código
   * 3. Lo envía por email
   *
   * @param userId - ID del usuario
   * @returns Nuevo token JWT
   */
  async resend2FACode(
    userId: string,
  ): Promise<{ token: string; message: string }> {
    // Buscar usuario
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // Revocar códigos anteriores
    await this.twoFactorTokenService.revokeAllUserCodes(userId)

    // Generar nuevo código
    const { code, token } = await this.twoFactorTokenService.generateCode(
      user.id,
    )

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5,
    })

    return {
      token,
      message: 'Nuevo código 2FA enviado',
    }
  }
}
