import { Injectable } from '@nestjs/common'
import { TokensService } from '../../services/tokens.service'

/**
 * Use Case: Logout de usuario
 *
 * Responsabilidades:
 * - Blacklistear el access token (para invalidarlo antes de expiry)
 * - Revocar el refresh token de Redis
 *
 * Esto implementa "logout real" - el token deja de funcionar inmediatamente
 */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * Ejecuta el flujo de logout
   *
   * @param userId - ID del usuario que hace logout
   * @param accessToken - Access token a blacklistear
   * @param refreshToken - Refresh token a revocar (opcional)
   */
  async execute(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    // 1. Blacklist del access token
    // Esto lo invalida inmediatamente, no hay que esperar a que expire
    await this.tokensService.blacklistAccessToken(accessToken, userId)

    // 2. Revocar refresh token si se proporcionó
    if (refreshToken) {
      try {
        const decoded = this.tokensService.decodeRefreshToken(refreshToken)
        await this.tokensService.revokeRefreshToken(userId, decoded.tokenId)
      } catch {
        // Token inválido, ignorar (ya está revocado de facto)
      }
    }
  }
}
