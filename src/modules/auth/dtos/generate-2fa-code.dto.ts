import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { TWO_FACTOR_CONSTRAINTS } from '../constants'

/**
 * DTO para generar un código 2FA
 *
 * El usuario proporciona su identificador (userId o email)
 * El sistema:
 * 1. Genera un código numérico aleatorio
 * 2. Almacena el código en Redis con TTL
 * 3. Envía el código por email
 * 4. Devuelve un token JWT para validación posterior
 */
export class Generate2FACodeDto {
  @ApiProperty({
    description: 'ID del usuario o email',
    example: 'usuario@example.com',
    maxLength: TWO_FACTOR_CONSTRAINTS.IDENTIFIER.MAX,
  })
  @IsString({ message: 'El identificador debe ser una cadena de texto' })
  @IsNotEmpty({ message: TWO_FACTOR_CONSTRAINTS.IDENTIFIER.MESSAGE })
  @MaxLength(TWO_FACTOR_CONSTRAINTS.IDENTIFIER.MAX)
  identifier: string
}
