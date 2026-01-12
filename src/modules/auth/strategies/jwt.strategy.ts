import { Injectable, Inject, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { TokensService } from '../services/tokens.service'
import { USERS_REPOSITORY } from '../../users/tokens'
import type { IUsersRepository } from '../../users/repositories'
import type { JwtPayload } from '../interfaces'
import type { Request } from 'express'

/**
 * JWT Strategy (Passport)
 *
 * Maneja la validación de access tokens
 * Usado para proteger rutas que requieren autenticación
 *
 * Verifica:
 * - Que el token sea válido y no haya expirado
 * - Que el token no esté en blacklist (logout)
 * - Que el usuario exista
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-secret-key-change-in-production',
      ),
      passReqToCallback: true, // Para acceder al token original
    })
  }

  /**
   * Valida el payload del JWT y verifica blacklist
   *
   * Este método es llamado automáticamente por Passport
   * después de que el token JWT ha sido verificado
   *
   * @param req - Request de Express (para extraer el token)
   * @param payload - Payload decodificado del JWT
   * @returns Payload validado (se adjunta a req.user)
   */
  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    // 1. Extraer token del header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado')
    }

    // 2. Verificar blacklist
    const isBlacklisted = await this.tokensService.isTokenBlacklisted(token)
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revocado')
    }

    // 3. Verificar que el usuario existe (opcional, para extra seguridad)
    const user = await this.usersRepository.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado')
    }

    // 4. Retornar payload (se adjunta a req.user)
    return payload
  }
}
