import { NotFoundException } from '@nestjs/common'

/**
 * Excepción cuando no se encuentra un usuario
 * Permite especificar el campo por el cual se buscó
 */
export class UserNotFoundException extends NotFoundException {
  constructor(
    identifier: string,
    field: 'ID' | 'Email' | 'Username' | 'CI' = 'ID',
  ) {
    super(`Usuario no encontrado con ${field}: '${identifier}'`)
  }
}
