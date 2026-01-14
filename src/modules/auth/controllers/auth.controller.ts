import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { AuthService } from '../services'
import {
  LoginDto,
  LoginResponseDto,
  RequestResetPasswordDto,
  ResetPasswordDto,
  Generate2FACodeDto,
  Verify2FACodeDto,
  Resend2FACodeDto,
} from '../dtos'
import { Public, GetUser } from '../decorators'
import type { JwtPayload } from '../interfaces'

/**
 * AuthController
 *
 * Maneja los endpoints de autenticación:
 * - Login: Autenticación inicial
 * - Refresh: Renovación de tokens con rotation
 * - Logout: Cierre de sesión con revocación de tokens
 * - Reset Password: Solicitar y resetear contraseña
 * - 2FA: Generar, verificar y reenviar códigos 2FA
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   *
   * Autentica un usuario con username/email y password
   *
   * @param loginDto - Credenciales de login
   * @param res - Express response para setear cookies
   * @returns Access token y datos del usuario
   *
   * @example
   * ```json
   * POST /auth/login
   * {
   *   "usernameOrEmail": "admin@example.com",
   *   "password": "SecurePass123!"
   * }
   * ```
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login exitoso',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas o usuario inactivo',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos fallidos',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const ip = this.extractIp(req)
    const { response, refreshToken } = await this.authService.login(loginDto, ip)

    // Configurar refresh token en HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken)

    // Retornar solo access token y datos del usuario
    return response
  }

  /**
   * POST /auth/refresh
   *
   * Renueva el access token usando el refresh token de la cookie
   * Implementa token rotation: el refresh token viejo se revoca y se genera uno nuevo
   *
   * @param req - Express request para leer cookies
   * @param res - Express response para setear nueva cookie
   * @returns Nuevo access token
   *
   * @example
   * ```
   * POST /auth/refresh
   * Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * ```
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token (con rotation)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token renovado exitosamente',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh token inválido, revocado o expirado',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const oldRefreshToken = req.cookies?.refreshToken

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado')
    }

    const result = await this.authService.refreshToken(oldRefreshToken)

    // Setear nuevo refresh token (rotation)
    this.setRefreshTokenCookie(res, result.refreshToken)

    // Retornar nuevo access token
    return {
      accessToken: result.accessToken,
    }
  }

  /**
   * POST /auth/logout
   *
   * Cierra la sesión del usuario:
   * - Blacklist del access token (revocación inmediata)
   * - Revocación del refresh token en Redis
   * - Limpieza de la cookie
   *
   * @param user - Usuario autenticado (del JWT)
   * @param req - Express request para leer headers y cookies
   * @param res - Express response para limpiar cookie
   *
   * @example
   * ```
   * POST /auth/logout
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * ```
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout de usuario' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Logout exitoso',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async logout(
    @GetUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // Extraer access token del header Authorization
    const accessToken = this.extractTokenFromHeader(req)

    // Extraer refresh token de la cookie
    const refreshToken = req.cookies?.refreshToken

    if (!accessToken) {
      throw new UnauthorizedException('Access token no encontrado')
    }

    // Revocar ambos tokens
    await this.authService.logout(user.sub, accessToken, refreshToken)

    // Limpiar cookie
    this.clearRefreshTokenCookie(res)
  }

  /**
   * Helper: Configura el refresh token en cookie HTTP-only
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // No accesible desde JavaScript (seguridad XSS)
      secure: isProduction, // Solo HTTPS en producción
      sameSite: 'strict', // Protección CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
      path: '/', // Disponible en toda la app
    })
  }

  /**
   * Helper: Limpia la cookie del refresh token
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
  }

  /**
   * Helper: Extrae el access token del header Authorization
   */
  private extractTokenFromHeader(req: Request): string | undefined {
    const authHeader = req.headers.authorization
    if (!authHeader) return undefined

    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }

  /**
   * Helper: Extrae la IP real del request (considera proxies)
   *
   * Prioridad:
   * 1. X-Forwarded-For (si está detrás de un proxy/load balancer)
   * 2. X-Real-IP (alternativa común)
   * 3. req.ip (directo de Express)
   */
  private extractIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
      // X-Forwarded-For puede ser una lista: "client, proxy1, proxy2"
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0]
      return ips.trim()
    }

    const realIp = req.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') {
      return realIp.trim()
    }

    return req.ip || 'unknown'
  }

  // ========================================
  // Reset Password Endpoints
  // ========================================

  /**
   * POST /auth/password/request-reset
   *
   * Solicita un reset de contraseña
   * Genera un token y envía email con link de reset
   *
   * @param dto - Email del usuario
   * @returns Mensaje de confirmación
   *
   * @example
   * ```json
   * POST /auth/password/request-reset
   * {
   *   "email": "usuario@example.com"
   * }
   * ```
   */
  @Public()
  @Post('password/request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email enviado (si el usuario existe)',
    schema: {
      properties: {
        message: {
          type: 'string',
          example:
            'Si el email existe, recibirás un link para resetear tu contraseña',
        },
      },
    },
  })
  async requestResetPassword(
    @Body() dto: RequestResetPasswordDto,
  ): Promise<{ message: string }> {
    return await this.authService.requestResetPassword(dto.email)
  }

  /**
   * POST /auth/password/reset
   *
   * Resetea la contraseña usando el token del email
   * Revoca el token y cierra todas las sesiones del usuario
   *
   * @param dto - Token y nueva contraseña
   * @returns Mensaje de confirmación
   *
   * @example
   * ```json
   * POST /auth/password/reset
   * {
   *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "newPassword": "NewSecurePass123!"
   * }
   * ```
   */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña con token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contraseña actualizada exitosamente',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Contraseña actualizada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Token inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos desde esta IP',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ip = this.extractIp(req)
    return await this.authService.resetPassword(dto.token, dto.newPassword, ip)
  }

  // ========================================
  // Two-Factor Authentication (2FA) Endpoints
  // ========================================

  /**
   * POST /auth/2fa/generate
   *
   * Genera un código 2FA y lo envía por email
   * Devuelve un token JWT para validación posterior
   *
   * @param dto - Email o userId
   * @returns Token JWT y mensaje de confirmación
   *
   * @example
   * ```json
   * POST /auth/2fa/generate
   * {
   *   "identifier": "usuario@example.com"
   * }
   * ```
   */
  @Public()
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar código 2FA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Código 2FA generado y enviado por email',
    schema: {
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        message: {
          type: 'string',
          example: 'Código 2FA enviado al email registrado',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  async generate2FACode(
    @Body() dto: Generate2FACodeDto,
  ): Promise<{ token: string; message: string }> {
    return await this.authService.generate2FACode(dto.identifier)
  }

  /**
   * POST /auth/2fa/verify
   *
   * Verifica un código 2FA
   * El código se elimina de Redis después del primer uso
   *
   * @param dto - userId, código y token opcional
   * @returns Resultado de la validación
   *
   * @example
   * ```json
   * POST /auth/2fa/verify
   * {
   *   "userId": "550e8400-e29b-41d4-a716-446655440000",
   *   "code": "123456",
   *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   * ```
   */
  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado de la verificación',
    schema: {
      properties: {
        valid: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Código verificado exitosamente',
        },
      },
    },
  })
  async verify2FACode(
    @Body() dto: Verify2FACodeDto,
  ): Promise<{ valid: boolean; message: string }> {
    return await this.authService.verify2FACode(dto.userId, dto.code, dto.token)
  }

  /**
   * POST /auth/2fa/resend
   *
   * Reenvía un código 2FA
   * Revoca el código anterior y genera uno nuevo
   *
   * @param dto - userId
   * @returns Nuevo token JWT
   *
   * @example
   * ```json
   * POST /auth/2fa/resend
   * {
   *   "userId": "550e8400-e29b-41d4-a716-446655440000"
   * }
   * ```
   */
  @Public()
  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código 2FA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nuevo código 2FA enviado',
    schema: {
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        message: {
          type: 'string',
          example: 'Nuevo código 2FA enviado',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  async resend2FACode(
    @Body() dto: Resend2FACodeDto,
  ): Promise<{ token: string; message: string }> {
    return await this.authService.resend2FACode(dto.userId)
  }
}
