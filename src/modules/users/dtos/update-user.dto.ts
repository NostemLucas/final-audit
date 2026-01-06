import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateUserDto } from './create-user.dto'

/**
 * DTO para actualizar un usuario
 * Todos los campos son opcionales excepto 'password' que se omite
 * (el password se actualiza mediante el módulo de autenticación)
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
