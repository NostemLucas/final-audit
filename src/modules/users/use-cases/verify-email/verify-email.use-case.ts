import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserEntity, UserStatus } from '../../entities/user.entity'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'
import { CacheService } from '@core/cache'

/**
 * Caso de uso: Verificar email de usuario
 *
 * Responsabilidades:
 * - Validar token de verificación
 * - Marcar email como verificado
 * - Activar usuario (cambiar status a ACTIVE)
 * - Eliminar token usado
 */
@Injectable()
export class VerifyEmailUseCase {
  private readonly VERIFICATION_PREFIX = 'email-verification:'
  private readonly VERIFICATION_TTL = 24 * 60 * 60 // 24 horas

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly cacheService: CacheService,
  ) {}

  @Transactional()
  async execute(token: string): Promise<UserEntity> {
    // 1. Buscar userId asociado al token en cache
    const cacheKey = `${this.VERIFICATION_PREFIX}${token}`
    const userId = await this.cacheService.get<string>(cacheKey)

    if (!userId) {
      throw new BadRequestException(
        'Token de verificación inválido o expirado',
      )
    }

    // 2. Buscar usuario
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      throw new BadRequestException('Usuario no encontrado')
    }

    // 3. Verificar si ya está verificado
    if (user.emailVerified) {
      return user // Ya estaba verificado, no hacer nada
    }

    // 4. Marcar como verificado y activar
    user.emailVerified = true
    user.emailVerifiedAt = new Date()
    user.status = UserStatus.ACTIVE

    // 5. Eliminar token del cache (solo se usa una vez)
    await this.cacheService.del(cacheKey)

    // 6. Guardar cambios
    return await this.usersRepository.save(user)
  }

  /**
   * Genera un token de verificación para un usuario
   *
   * @param userId - ID del usuario
   * @returns Token de verificación (UUID)
   */
  async generateVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomUUID()
    const cacheKey = `${this.VERIFICATION_PREFIX}${token}`

    // Guardar userId asociado al token por 24 horas
    await this.cacheService.set(cacheKey, userId, this.VERIFICATION_TTL)

    return token
  }
}
