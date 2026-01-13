import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

/**
 * DTO para solicitar un reset de contraseña
 *
 * El usuario proporciona su email y el sistema:
 * 1. Verifica que el email existe
 * 2. Genera un token de reset password (JWT + Redis)
 * 3. Envía un email con el link de reset
 */
export class RequestResetPasswordDto {
  @ApiProperty({
    description: 'Email del usuario que solicita el reset',
    example: 'usuario@example.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string
}
