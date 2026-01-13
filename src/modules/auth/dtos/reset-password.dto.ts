import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { PASSWORD_RESET_CONSTRAINTS } from '../constants'

/**
 * DTO para resetear la contraseña usando el token
 *
 * El usuario proporciona:
 * 1. Token de reset (recibido por email)
 * 2. Nueva contraseña (con requisitos de complejidad)
 *
 * El sistema valida el token (JWT + Redis) y actualiza la contraseña
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de reset password (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    minLength: PASSWORD_RESET_CONSTRAINTS.TOKEN.MIN,
    maxLength: PASSWORD_RESET_CONSTRAINTS.TOKEN.MAX,
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es requerido' })
  @MinLength(PASSWORD_RESET_CONSTRAINTS.TOKEN.MIN)
  @MaxLength(PASSWORD_RESET_CONSTRAINTS.TOKEN.MAX)
  token: string

  @ApiProperty({
    description: 'Nueva contraseña (debe cumplir requisitos de complejidad)',
    example: 'NewSecurePass123!',
    minLength: PASSWORD_RESET_CONSTRAINTS.PASSWORD.MIN,
    maxLength: PASSWORD_RESET_CONSTRAINTS.PASSWORD.MAX,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(PASSWORD_RESET_CONSTRAINTS.PASSWORD.MIN, {
    message: `La contraseña debe tener al menos ${PASSWORD_RESET_CONSTRAINTS.PASSWORD.MIN} caracteres`,
  })
  @MaxLength(PASSWORD_RESET_CONSTRAINTS.PASSWORD.MAX, {
    message: `La contraseña no puede exceder ${PASSWORD_RESET_CONSTRAINTS.PASSWORD.MAX} caracteres`,
  })
  @Matches(PASSWORD_RESET_CONSTRAINTS.PASSWORD.PATTERN, {
    message: PASSWORD_RESET_CONSTRAINTS.PASSWORD.MESSAGE,
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  newPassword: string
}
