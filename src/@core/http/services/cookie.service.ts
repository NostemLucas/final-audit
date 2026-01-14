import { Injectable } from '@nestjs/common'
import { Request, Response } from 'express'

/**
 * Servicio centralizado para manejo de cookies HTTP-only
 *
 * Maneja cookies de forma segura con las mejores prácticas:
 * - httpOnly: true - No accesible desde JavaScript (previene XSS)
 * - secure: true (producción) - Solo sobre HTTPS
 * - sameSite: 'strict' - Protección contra CSRF
 * - maxAge configurab le - Tiempo de expiración
 *
 * Actualmente se usa para:
 * - Refresh tokens (JWT de larga duración)
 */
@Injectable()
export class CookieService {
  private readonly REFRESH_TOKEN_COOKIE = 'refreshToken'
  private readonly isProduction = process.env.NODE_ENV === 'production'

  /**
   * Establece una cookie con el refresh token
   *
   * @param res - Response de Express
   * @param refreshToken - Token JWT a almacenar
   * @param maxAgeMs - Tiempo de expiración en milisegundos (default: 7 días)
   */
  setRefreshToken(
    res: Response,
    refreshToken: string,
    maxAgeMs: number = 7 * 24 * 60 * 60 * 1000,
  ): void {
    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      maxAge: maxAgeMs,
      path: '/',
    })
  }

  /**
   * Elimina la cookie del refresh token
   *
   * @param res - Response de Express
   */
  clearRefreshToken(res: Response): void {
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/',
    })
  }

  /**
   * Obtiene el refresh token de la cookie
   *
   * @param req - Request de Express
   * @returns Refresh token si existe, undefined si no
   */
  getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[this.REFRESH_TOKEN_COOKIE]
  }
}
