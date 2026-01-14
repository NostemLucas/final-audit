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
import { RealIp } from '@core/decorators/real-ip.decorator'
import { CookieService } from '@core/http/services/cookie.service'
import { LoginDto, LoginResponseDto } from '../dtos'
import { Public, GetUser } from '../decorators'
import type { JwtPayload } from '../interfaces'
import {
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
} from '../use-cases'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly cookieService: CookieService,
  ) {}

  /**
   * POST /auth/login
   *
   * Autentica un usuario con username/email y password
   *
   * @param loginDto - Credenciales de login
   * @param ip - Dirección IP del usuario (para rate limiting)
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
    @RealIp() ip: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { response, refreshToken } = await this.loginUseCase.execute(
      loginDto,
      ip,
    )

    // Configurar refresh token en HTTP-only cookie
    this.cookieService.setRefreshToken(res, refreshToken)

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
    const oldRefreshToken = this.cookieService.getRefreshToken(req)

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado')
    }

    const result = await this.refreshTokenUseCase.execute(oldRefreshToken)

    // Setear nuevo refresh token (rotation)
    this.cookieService.setRefreshToken(res, result.refreshToken)

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
    const refreshToken = this.cookieService.getRefreshToken(req)

    if (!accessToken) {
      throw new UnauthorizedException('Access token no encontrado')
    }

    // Revocar ambos tokens
    await this.logoutUseCase.execute(user.sub, accessToken, refreshToken)

    // Limpiar cookie
    this.cookieService.clearRefreshToken(res)
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
}
