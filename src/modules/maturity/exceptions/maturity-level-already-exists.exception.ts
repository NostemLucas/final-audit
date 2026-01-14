import { ConflictException } from '@nestjs/common'

/**
 * Excepción lanzada cuando se intenta crear un nivel que ya existe en el framework
 */
export class MaturityLevelAlreadyExistsException extends ConflictException {
  constructor(frameworkId: string, level: number) {
    super(
      `Ya existe el nivel ${level} en el framework con ID "${frameworkId}"`,
    )
  }
}
