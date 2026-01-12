import { UnauthorizedException } from '@nestjs/common'

/**
 * Excepción lanzada cuando las credenciales de login son inválidas
 *
 * Se lanza cuando:
 * - El usuario no existe
 * - La contraseña es incorrecta
 *
 * NOTA: No especificamos cuál es el error exacto por seguridad
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Credenciales inválidas')
  }
}
