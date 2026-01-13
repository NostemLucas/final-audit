import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator'

/**
 * DTO para verificar un código 2FA
 *
 * El usuario proporciona:
 * 1. userId - ID del usuario que recibió el código
 * 2. code - Código numérico recibido por email
 * 3. token - Token JWT opcional para validación adicional
 *
 * El sistema valida:
 * 1. JWT (si se proporciona)
 * 2. Código existe en Redis y no ha expirado
 * 3. Código coincide con el userId
 * 4. Elimina el código de Redis (un solo uso)
 */
export class Verify2FACodeDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'El userId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El userId es requerido' })
  userId: string

  @ApiProperty({
    description: 'Código numérico de 6 dígitos',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  @Matches(/^\d{6}$/, {
    message: 'El código debe contener solo números',
  })
  @IsNotEmpty({ message: 'El código es requerido' })
  code: string

  @ApiProperty({
    description: 'Token JWT opcional para validación adicional',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  token?: string
}
