import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator'
import { TWO_FACTOR_CONSTRAINTS } from '../constants'

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
    maxLength: TWO_FACTOR_CONSTRAINTS.IDENTIFIER.MAX,
  })
  @IsString({ message: 'El userId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El userId es requerido' })
  @MaxLength(TWO_FACTOR_CONSTRAINTS.IDENTIFIER.MAX)
  userId: string

  @ApiProperty({
    description: `Código numérico de ${TWO_FACTOR_CONSTRAINTS.CODE.LENGTH} dígitos`,
    example: '123456',
    minLength: TWO_FACTOR_CONSTRAINTS.CODE.LENGTH,
    maxLength: TWO_FACTOR_CONSTRAINTS.CODE.LENGTH,
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @Length(TWO_FACTOR_CONSTRAINTS.CODE.LENGTH, TWO_FACTOR_CONSTRAINTS.CODE.LENGTH, {
    message: `El código debe tener exactamente ${TWO_FACTOR_CONSTRAINTS.CODE.LENGTH} dígitos`,
  })
  @Matches(TWO_FACTOR_CONSTRAINTS.CODE.PATTERN, {
    message: TWO_FACTOR_CONSTRAINTS.CODE.MESSAGE,
  })
  @IsNotEmpty({ message: 'El código es requerido' })
  code: string

  @ApiProperty({
    description: 'Token JWT opcional para validación adicional',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
    minLength: TWO_FACTOR_CONSTRAINTS.TOKEN.MIN,
    maxLength: TWO_FACTOR_CONSTRAINTS.TOKEN.MAX,
  })
  @IsOptional()
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @MinLength(TWO_FACTOR_CONSTRAINTS.TOKEN.MIN)
  @MaxLength(TWO_FACTOR_CONSTRAINTS.TOKEN.MAX)
  token?: string
}
