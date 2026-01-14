import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Too Many Attempts Exception
 *
 * Excepción lanzada cuando se excede el límite de intentos permitidos
 * Útil para rate limiting y prevención de fuerza bruta
 *
 * HTTP Status: 429 Too Many Requests
 *
 * @example
 * ```typescript
 * if (attempts >= maxAttempts) {
 *   throw new TooManyAttemptsException(
 *     'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'
 *   )
 * }
 * ```
 */
export class TooManyAttemptsException extends HttpException {
  constructor(message?: string) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          message || 'Demasiados intentos. Por favor, intenta más tarde.',
        error: 'Too Many Attempts',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}
