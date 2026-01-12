import { UnauthorizedException } from '@nestjs/common'

/**
 * Excepción lanzada cuando un token JWT es inválido
 *
 * Se lanza cuando:
 * - El token está malformado
 * - El token ha expirado
 * - El token ha sido revocado
 * - La firma no es válida
 */
export class InvalidTokenException extends UnauthorizedException {
  constructor(message: string = 'Token inválido') {
    super(message)
  }
}
