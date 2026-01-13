import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

/**
 * DTO para reenviar un código 2FA
 *
 * Similar a Generate2FACodeDto pero específico para reenvío.
 * El sistema:
 * 1. Revoca el código anterior (si existe)
 * 2. Genera un nuevo código
 * 3. Lo envía por email
 */
export class Resend2FACodeDto {
  @ApiProperty({
    description: 'ID del usuario que necesita reenvío del código',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'El userId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El userId es requerido' })
  userId: string
}
