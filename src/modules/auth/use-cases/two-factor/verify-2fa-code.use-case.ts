import { Injectable } from '@nestjs/common'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'

/**
 * Use Case: Verificar código 2FA
 *
 * Responsabilidades:
 * - Validar el código contra Redis
 * - Validar el JWT (opcional)
 * - Eliminar el código de Redis después del primer uso (one-time use)
 *
 * Seguridad:
 * - Código de un solo uso (se elimina después de validarse)
 * - Expira en 5 minutos
 * - Opcional: valida JWT para vincular con sesión
 */
@Injectable()
export class Verify2FACodeUseCase {
  constructor(
    private readonly twoFactorTokenService: TwoFactorTokenService,
  ) {}

  /**
   * Ejecuta el flujo de verificación de código 2FA
   *
   * @param userId - ID del usuario
   * @param code - Código numérico de 6 dígitos
   * @param token - Token JWT opcional para validación adicional
   * @returns Resultado de la validación con mensaje
   */
  async execute(
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
}
