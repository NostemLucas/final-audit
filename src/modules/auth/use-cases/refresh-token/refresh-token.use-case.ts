import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { TokensService } from '../../services/tokens.service'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'
import type { JwtRefreshPayload } from '../../interfaces'
import { InvalidTokenException } from '../../exceptions'

/**
 * Use Case: Renovar tokens (Token Rotation)
 *
 * Responsabilidades:
 * - Validar refresh token
 * - Verificar que no haya sido revocado (Redis)
 * - ROTATION: Revocar el token viejo
 * - Generar nuevo par de tokens
 *
 * Implementa token rotation para máxima seguridad
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ejecuta el flujo de refresh (con rotation)
   *
   * @param oldRefreshToken - Refresh token actual del usuario
   * @returns Nuevo par de tokens (access + refresh)
   * @throws InvalidTokenException si el token es inválido o revocado
   */
  async execute(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verificar y decodificar refresh token
    let payload: JwtRefreshPayload
    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      })
    } catch (error) {
      throw new InvalidTokenException('Refresh token inválido o expirado')
    }

    // 2. Verificar que el token no haya sido revocado (existe en Redis)
    const isValid = await this.tokensService.validateRefreshToken(
      payload.sub,
      payload.tokenId,
    )

    if (!isValid) {
      throw new InvalidTokenException(
        'Refresh token revocado o ya ha sido usado',
      )
    }

    // 3. Buscar usuario
    const user = await this.usersRepository.findById(payload.sub)

    if (!user) {
      throw new InvalidTokenException('Usuario no encontrado')
    }

    // 4. ROTATION: Revocar el refresh token viejo
    await this.tokensService.revokeRefreshToken(payload.sub, payload.tokenId)

    // 5. Generar nuevo par de tokens
    const { accessToken, refreshToken } =
      await this.tokensService.generateTokenPair(user)

    return { accessToken, refreshToken }
  }
}
