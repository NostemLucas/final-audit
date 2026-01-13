import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { LOGIN_CONSTRAINTS } from '../constants'

/**
 * DTO para el login de usuarios
 *
 * Acepta email o username como identificador
 * Las validaciones son FLEXIBLES (solo límites, no complejidad)
 * porque debe aceptar cualquier password existente
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email o username del usuario',
    example: 'usuario@example.com',
    maxLength: LOGIN_CONSTRAINTS.USERNAME_OR_EMAIL.MAX,
  })
  @IsString()
  @IsNotEmpty({ message: LOGIN_CONSTRAINTS.USERNAME_OR_EMAIL.MESSAGE })
  @MaxLength(LOGIN_CONSTRAINTS.USERNAME_OR_EMAIL.MAX)
  usernameOrEmail: string

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
    maxLength: LOGIN_CONSTRAINTS.PASSWORD.MAX,
  })
  @IsString()
  @IsNotEmpty({ message: LOGIN_CONSTRAINTS.PASSWORD.MESSAGE })
  @MaxLength(LOGIN_CONSTRAINTS.PASSWORD.MAX)
  password: string
}
