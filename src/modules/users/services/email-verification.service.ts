import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TokenStorageService, REDIS_PREFIXES } from '@core/cache'
import { EmailService } from '@core/email'
import { USERS_REPOSITORY } from '../tokens'
import type { IUsersRepository } from '../repositories'

/**
 * Servicio de Verificación de Email (Simplificado)
 *
 * Responsabilidades:
 * - Generar token y enviar invitación
 * - Validar y consumir token
 *
 * Optimizaciones:
 * - Usa mapping inverso token->userId para evitar KEYS scan
 * - Revoca automáticamente tokens anteriores
 * - Interfaz mínima (solo lo necesario)
 */
@Injectable()
export class EmailVerificationService {
  private readonly VERIFICATION_TTL = 24 * 60 * 60 // 24 horas
  private readonly TOKEN_MAP_PREFIX = 'token-map:verify-email:'
  private readonly frontendUrl: string

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly tokenStorage: TokenStorageService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
  }

  /**
   * Genera token de verificación y envía invitación
   *
   * SIEMPRE revoca tokens anteriores del usuario.
   * Si el email ya está verificado, lanza error.
   *
   * @param userId - ID del usuario
   * @returns Token generado y email del destinatario
   */
  async generateAndSendInvitation(
    userId: string,
  ): Promise<{ tokenId: string; email: string }> {
    // 1. Buscar usuario
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    // 2. Validar que no esté verificado
    if (user.emailVerified) {
      throw new BadRequestException(
        'El email ya ha sido verificado. No es necesario enviar una nueva invitación.',
      )
    }

    // 3. Revocar TODOS los tokens anteriores del usuario
    await this.tokenStorage.revokeAllUserTokens(
      userId,
      REDIS_PREFIXES.EMAIL_VERIFICATION,
    )

    // 4. Generar nuevo token
    const tokenId = this.tokenStorage.generateTokenId()

    // 5. Guardar token con datos del usuario
    await this.tokenStorage.storeTokenWithMetadata(
      userId,
      tokenId,
      {
        email: user.email,
        fullName: user.fullName,
      },
      {
        prefix: REDIS_PREFIXES.EMAIL_VERIFICATION,
        ttlSeconds: this.VERIFICATION_TTL,
      },
    )

    // 6. Crear mapping inverso: token -> userId (para búsqueda rápida)
    await this.tokenStorage.storeSimple(
      `${this.TOKEN_MAP_PREFIX}${tokenId}`,
      userId,
      this.VERIFICATION_TTL,
    )

    // 7. Construir link y enviar email
    const verificationLink = this.buildVerificationLink(tokenId)
    await this.emailService.sendVerificationEmail({
      to: user.email,
      userName: user.fullName,
      verificationLink,
    })

    return { tokenId, email: user.email }
  }

  /**
   * Busca y consume un token de verificación
   *
   * Optimizado: usa mapping inverso, no hace KEYS scan.
   * El token se REVOCA automáticamente después de obtener los datos.
   *
   * @param tokenId - Token UUID
   * @returns Datos del token { userId, email, fullName } o null si inválido
   */
  async consumeToken(tokenId: string): Promise<{
    userId: string
    email: string
    fullName: string
  } | null> {
    // 1. Buscar userId usando mapping inverso (O(1) en Redis)
    const mapKey = `${this.TOKEN_MAP_PREFIX}${tokenId}`
    const userId = await this.tokenStorage['redis'].get(mapKey)

    if (!userId) {
      return null // Token inválido o expirado
    }

    // 2. Obtener datos del token
    const tokenData = await this.tokenStorage.getTokenData(
      userId,
      tokenId,
      REDIS_PREFIXES.EMAIL_VERIFICATION,
    )

    if (!tokenData || !tokenData.metadata) {
      return null
    }

    // 3. Revocar token (one-time use)
    await this.revokeToken(userId, tokenId)

    // 4. Retornar datos
    return {
      userId,
      email: tokenData.metadata.email as string,
      fullName: tokenData.metadata.fullName as string,
    }
  }

  /**
   * Revoca un token específico y su mapping inverso
   *
   * @param userId - ID del usuario
   * @param tokenId - Token UUID
   */
  private async revokeToken(userId: string, tokenId: string): Promise<void> {
    // Revocar token principal
    await this.tokenStorage.revokeToken(
      userId,
      tokenId,
      REDIS_PREFIXES.EMAIL_VERIFICATION,
    )

    // Revocar mapping inverso
    await this.tokenStorage.deleteSimple(`${this.TOKEN_MAP_PREFIX}${tokenId}`)
  }

  /**
   * Construye el link de verificación
   */
  private buildVerificationLink(tokenId: string): string {
    return `${this.frontendUrl}/verify-email?token=${tokenId}`
  }
}
