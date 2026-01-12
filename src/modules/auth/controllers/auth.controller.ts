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
import * as express from 'express'
import { AuthService } from '../services'
import { LoginDto, LoginResponseDto } from '../dtos'
import { Public, GetUser } from '../decorators'
import * as AuthInterfaces from '../interfaces'

/**
 * AuthController
 *
 * Maneja los endpoints de autenticación:
 * - Login: Autenticación inicial
 * - Refresh: Renovación de tokens con rotation
 * - Logout: Cierre de sesión con revocación de tokens
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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<LoginResponseDto> {
    const { response, refreshToken } = await this.authService.login(loginDto)

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
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
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
    @GetUser() user: AuthInterfaces.JwtPayload,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
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
  private setRefreshTokenCookie(
    res: express.Response,
    refreshToken: string,
  ): void {
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
  private clearRefreshTokenCookie(res: express.Response): void {
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
  private extractTokenFromHeader(req: express.Request): string | undefined {
    const authHeader = req.headers.authorization
    if (!authHeader) return undefined

    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}
