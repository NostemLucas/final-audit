import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  Generate2FACodeDto,
  Verify2FACodeDto,
  Resend2FACodeDto,
} from '../dtos'
import { Public, GetUser } from '../decorators'
import { JwtAuthGuard } from '../guards'
import {
  Generate2FACodeUseCase,
  Verify2FACodeUseCase,
  Resend2FACodeUseCase,
} from '../use-cases/two-factor'

/**
 * TwoFactorController
 *
 * Maneja endpoints relacionados con autenticación de dos factores (2FA):
 * - Generar código 2FA (envía email)
 * - Verificar código 2FA
 * - Reenviar código 2FA
 */
@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(
    private readonly generateUseCase: Generate2FACodeUseCase,
    private readonly verifyUseCase: Verify2FACodeUseCase,
    private readonly resendUseCase: Resend2FACodeUseCase,
  ) {}

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
  @Post('generate')
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
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos de generación',
  })
  async generate(
    @Body() dto: Generate2FACodeDto,
  ): Promise<{ token: string; message: string }> {
    return await this.generateUseCase.execute(dto.identifier)
  }

  /**
   * POST /auth/2fa/verify
   *
   * Verifica un código 2FA
   * El código se elimina de Redis después del primer uso
   *
   * @param dto - userId, código y token
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
  @Post('verify')
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
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos fallidos',
  })
  async verify(
    @Body() dto: Verify2FACodeDto,
  ): Promise<{ valid: boolean; message: string }> {
    return await this.verifyUseCase.execute(dto.userId, dto.code, dto.token)
  }

  /**
   * POST /auth/2fa/resend
   *
   * Reenvía un código 2FA
   * Revoca el código anterior y genera uno nuevo
   *
   * @param userId - ID del usuario autenticado
   * @returns Nuevo token JWT
   *
   * @example
   * ```json
   * POST /auth/2fa/resend
   * Authorization: Bearer <access-token>
   * ```
   */
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
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
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos de reenvío',
  })
  async resend(
    @GetUser('sub') userId: string,
  ): Promise<{ token: string; message: string }> {
    return await this.resendUseCase.execute(userId)
  }
}
