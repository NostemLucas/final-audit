import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import ms, { StringValue } from 'ms'

/**
 * Helper service para operaciones JWT compartidas
 *
 * Centraliza toda la lógica común de JWT que se repite en los servicios de tokens:
 * - Generación de tokens firmados
 * - Verificación de tokens
 * - Decodificación de tokens
 * - Conversión de tiempos de expiración
 *
 * Usando composición sobre herencia para mayor flexibilidad.
 */
@Injectable()
export class JwtTokenHelper {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Genera un JWT firmado con el payload, secret y tiempo de expiración proporcionados
   *
   * @param payload - Datos a incluir en el token
   * @param secret - Secret para firmar el token
   * @param expiresIn - Tiempo de expiración (ej: "15m", "7d")
   * @returns Token JWT firmado
   *
   * @example
   * const token = this.jwtTokenHelper.generateSignedToken(
   *   { sub: userId, type: 'reset' },
   *   'my-secret',
   *   '1h'
   * )
   */
  generateSignedToken<T extends object>(
    payload: T,
    secret: string,
    expiresIn: string,
  ): string {
    return this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn as StringValue,
    })
  }

  /**
   * Verifica un JWT y devuelve el payload tipado
   *
   * @param token - Token JWT a verificar
   * @param secret - Secret usado para firmar el token
   * @returns Payload del token o null si es inválido
   *
   * @example
   * const payload = this.jwtTokenHelper.verifyToken<ResetPasswordPayload>(
   *   token,
   *   'my-secret'
   * )
   * if (payload) {
   *   // Token válido, usar payload
   * }
   */
  verifyToken<T extends object>(token: string, secret: string): T | null {
    try {
      return this.jwtService.verify<T>(token, { secret })
    } catch {
      return null
    }
  }

  /**
   * Decodifica un JWT sin verificar la firma
   *
   * ADVERTENCIA: Este método NO verifica la firma del JWT.
   * Solo debe usarse cuando:
   * 1. Ya verificaste el token con verifyToken()
   * 2. Solo necesitas extraer información para validación posterior
   * 3. Vas a validar contra otra fuente (ej: Redis)
   *
   * @param token - Token JWT a decodificar
   * @returns Payload decodificado o null si el formato es inválido
   *
   * @example
   * const payload = this.jwtTokenHelper.decodeToken<ResetPasswordPayload>(token)
   * if (payload) {
   *   // Validar contra Redis u otra fuente
   * }
   */
  decodeToken<T extends object>(token: string): T | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.jwtService.decode(token)

      if (!decoded || typeof decoded === 'string') {
        return null
      }

      return decoded as T
    } catch {
      return null
    }
  }

  /**
   * Convierte un string de expiración a segundos usando la librería ms
   *
   * Utiliza la misma librería que NestJS usa internamente para JWT,
   * garantizando consistencia en el parsing de tiempos.
   *
   * Soporta las siguientes unidades (por la librería ms):
   * - ms: milisegundos (ej: "1000ms" = 1 segundo)
   * - s: segundos (ej: "30s" = 30 segundos)
   * - m: minutos (ej: "15m" = 900 segundos)
   * - h: horas (ej: "1h" = 3600 segundos)
   * - d: días (ej: "7d" = 604800 segundos)
   * - w: semanas (ej: "1w" = 604800 segundos)
   * - y: años (ej: "1y" = 31557600 segundos)
   *
   * @param expiryString - String de expiración (ej: "15m", "1h", "7d")
   * @param defaultSeconds - Valor por defecto si el formato es inválido
   * @returns Tiempo en segundos
   *
   * @example
   * const ttl = this.jwtTokenHelper.getExpirySeconds('15m') // 900
   * const ttl = this.jwtTokenHelper.getExpirySeconds('1h') // 3600
   * const ttl = this.jwtTokenHelper.getExpirySeconds('7d') // 604800
   */
  getExpirySeconds(expiryString: string, defaultSeconds = 900): number {
    try {
      const milliseconds = ms(expiryString as StringValue)

      // ms() puede devolver undefined si el formato es inválido
      if (milliseconds === undefined) {
        return defaultSeconds
      }

      // Convertir de milisegundos a segundos
      return Math.floor(milliseconds / 1000)
    } catch {
      return defaultSeconds
    }
  }

  /**
   * Valida que un payload tenga un tipo específico
   *
   * Útil para verificar que un token es del tipo correcto antes de procesarlo.
   *
   * @param payload - Payload a validar (cualquier objeto con propiedad type)
   * @param expectedType - Tipo esperado
   * @returns true si el tipo coincide
   *
   * @example
   * const payload = this.jwtTokenHelper.verifyToken(token, secret)
   * if (payload && this.jwtTokenHelper.validateTokenType(payload, 'reset-password')) {
   *   // Es un token de reset password válido
   * }
   */
  validateTokenType<T extends { type?: unknown }>(
    payload: T,
    expectedType: string,
  ): boolean {
    return payload.type === expectedType
  }
}
