import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { RealIp } from '@core/decorators/real-ip.decorator'
import { RequestResetPasswordDto, ResetPasswordDto } from '../dtos'
import { Public } from '../decorators'
import {
  RequestResetPasswordUseCase,
  ResetPasswordUseCase,
} from '../use-cases/password-reset'

/**
 * PasswordResetController
 *
 * Maneja endpoints relacionados con recuperación de contraseña:
 * - Solicitar token de reset (envía email)
 * - Resetear contraseña con token válido
 */
@ApiTags('Password Reset')
@Controller('auth/password')
export class PasswordResetController {
  constructor(
    private readonly requestResetUseCase: RequestResetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  /**
   * POST /auth/password/request-reset
   *
   * Solicita un reset de contraseña
   * Genera un token y envía email con link de reset
   *
   * @param dto - Email del usuario
   * @param ip - IP del cliente (rate limiting)
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
  @Post('request-reset')
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
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos desde esta IP',
  })
  async requestReset(
    @Body() dto: RequestResetPasswordDto,
    @RealIp() ip: string,
  ): Promise<{ message: string }> {
    return await this.requestResetUseCase.execute(dto.email, ip)
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
  @Post('reset')
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
  async reset(
    @Body() dto: ResetPasswordDto,
    @RealIp() ip: string,
  ): Promise<{ message: string }> {
    return await this.resetPasswordUseCase.execute(
      dto.token,
      dto.newPassword,
      ip,
    )
  }
}
