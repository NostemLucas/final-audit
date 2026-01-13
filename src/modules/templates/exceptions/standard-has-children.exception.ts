import { BadRequestException } from '@nestjs/common'

export class StandardHasChildrenException extends BadRequestException {
  constructor(standardId: string, childCount: number) {
    super(
      `No se puede eliminar el standard ${standardId} porque tiene ${childCount} hijo(s). Elimine primero los hijos o muévalos a otro padre.`,
    )
  }
}
