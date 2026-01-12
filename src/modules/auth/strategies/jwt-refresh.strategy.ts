import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type { JwtRefreshPayload } from '../interfaces'

/**
 * JWT Refresh Strategy (Passport)
 *
 * Maneja la validación de refresh tokens
 * Extrae el token de la cookie HTTP-only
 *
 * NOTA: La validación de revocación se hace en RefreshTokenUseCase,
 * esta strategy solo verifica la firma del JWT
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extraer de cookie HTTP-only
          return request?.cookies?.refreshToken
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_REFRESH_SECRET',
        'your-different-refresh-secret-change-in-production',
      ),
      passReqToCallback: false,
    })
  }

  /**
   * Valida el payload del refresh token
   *
   * La validación de revocación (Redis) se hace en el use case,
   * aquí solo retornamos el payload decodificado
   *
   * @param payload - Payload decodificado del JWT
   * @returns Payload validado
   */
  async validate(payload: JwtRefreshPayload): Promise<JwtRefreshPayload> {
    // La validación de revocación se hace en RefreshTokenUseCase
    return payload
  }
}
