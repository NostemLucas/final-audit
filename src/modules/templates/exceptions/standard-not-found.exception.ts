import { NotFoundException } from '@nestjs/common'

export class StandardNotFoundException extends NotFoundException {
  constructor(standardId: string) {
    super(`Standard con ID ${standardId} no encontrado`)
  }
}
