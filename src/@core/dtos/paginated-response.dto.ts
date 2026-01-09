/**
 * Metadata de paginación incluida en todas las respuestas paginadas
 */
export interface PaginationMeta {
  /**
   * Número total de registros
   */
  total: number

  /**
   * Página actual
   */
  page: number

  /**
   * Registros por página
   */
  limit: number

  /**
   * Número total de páginas
   */
  totalPages: number

  /**
   * Indica si hay una página siguiente
   */
  hasNextPage: boolean

  /**
   * Indica si hay una página anterior
   */
  hasPrevPage: boolean
}

/**
 * Respuesta paginada estandarizada
 *
 * @example
 * ```typescript
 * {
 *   data: [...],
 *   meta: {
 *     total: 100,
 *     page: 1,
 *     limit: 10,
 *     totalPages: 10,
 *     hasNextPage: true,
 *     hasPrevPage: false
 *   }
 * }
 * ```
 */
export interface PaginatedResponse<T> {
  /**
   * Array de datos paginados
   */
  data: T[]

  /**
   * Metadata de la paginación
   */
  meta: PaginationMeta
}

/**
 * Clase helper para crear respuestas paginadas
 */
export class PaginatedResponseBuilder {
  /**
   * Crea una respuesta paginada estandarizada
   *
   * @param data - Array de datos
   * @param total - Total de registros
   * @param page - Página actual
   * @param limit - Registros por página
   * @returns Respuesta paginada con metadata
   *
   * @example
   * ```typescript
   * const response = PaginatedResponseBuilder.create(
   *   users,
   *   100,
   *   1,
   *   10
   * )
   * ```
   */
  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Crea una respuesta con todos los registros (sin paginación real)
   * Pero mantiene la misma estructura para consistencia
   *
   * @param data - Array de datos
   * @returns Respuesta paginada con todos los registros
   *
   * @example
   * ```typescript
   * const response = PaginatedResponseBuilder.createAll(allUsers)
   * // {
   * //   data: [...100 users],
   * //   meta: {
   * //     total: 100,
   * //     page: 1,
   * //     limit: 100,
   * //     totalPages: 1,
   * //     hasNextPage: false,
   * //     hasPrevPage: false
   * //   }
   * // }
   * ```
   */
  static createAll<T>(data: T[]): PaginatedResponse<T> {
    const total = data.length

    return {
      data,
      meta: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }

  /**
   * Crea una respuesta vacía (sin datos)
   *
   * @returns Respuesta paginada vacía
   */
  static createEmpty<T>(): PaginatedResponse<T> {
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }
}
