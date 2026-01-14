import { Injectable } from '@nestjs/common'
import { TwoFactorTokenService } from '../../services/two-factor-token.service'

/**
 * Use Case: Verificar código 2FA
 *
 * Responsabilidades:
 * - Validar el JWT (OBLIGATORIO - vincula sesión con código)
 * - Validar el código contra Redis
 * - Eliminar el código de Redis después del primer uso (one-time use)
 *
 * Seguridad:
 * - JWT obligatorio para prevenir ataques sin sesión
 * - Código de un solo uso (se elimina después de validarse)
 * - Expira en 5 minutos
 * - Rate limiting: máximo 5 intentos por tokenId
 */
@Injectable()
export class Verify2FACodeUseCase {
  constructor(private readonly twoFactorTokenService: TwoFactorTokenService) {}

  /**
   * Ejecuta el flujo de verificación de código 2FA
   *
   * @param userId - ID del usuario
   * @param code - Código numérico de 6 dígitos
   * @param token - Token JWT OBLIGATORIO (vincula sesión con código)
   * @returns Resultado de la validación con mensaje
   * @throws TooManyAttemptsException si se exceden intentos
   */
  async execute(
    userId: string,
    code: string,
    token: string,
  ): Promise<{ valid: boolean; message: string }> {
    // Validar código (el token es obligatorio)
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
