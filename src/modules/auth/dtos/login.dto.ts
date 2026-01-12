import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para el login de usuarios
 *
 * Acepta email o username como identificador
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email o username del usuario',
    example: 'usuario@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'El email o username es requerido' })
  usernameOrEmail: string

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string
}
