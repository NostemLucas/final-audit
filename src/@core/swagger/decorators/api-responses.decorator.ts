/**
 * Custom API Response Decorators
 *
 * Decoradores personalizados que simplifican la documentación de endpoints.
 * En lugar de escribir múltiples @ApiResponse, usa decoradores compuestos.
 *
 * Ejemplo:
 *   @ApiStandardResponses()
 *   @ApiCreatedResponse(UserDto)
 *   @ApiConflictResponse('Usuario ya existe')
 */

import { applyDecorators, Type } from '@nestjs/common'
import { ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger'
import {
  VALIDATION_ERROR_RESPONSE,
  UNAUTHORIZED_RESPONSE,
  FORBIDDEN_RESPONSE,
  NOT_FOUND_RESPONSE,
  CONFLICT_RESPONSE,
  INTERNAL_SERVER_ERROR_RESPONSE,
} from '../responses/standard-responses'

/**
 * Aplica respuestas estándar comunes a todos los endpoints
 *
 * Incluye:
 * - 400: Validación de datos
 * - 401: No autenticado
 * - 403: Sin permisos
 * - 500: Error interno
 *
 * @param options - Opciones para incluir/excluir respuestas
 *
 * @example
 * @ApiStandardResponses()
 * async myEndpoint() {}
 *
 * @example
 * // Sin autenticación
 * @ApiStandardResponses({ exclude: [401, 403] })
 * async publicEndpoint() {}
 */
export function ApiStandardResponses(options?: {
  exclude?: number[]
}): MethodDecorator {
  const exclude = options?.exclude || []
  const decorators: MethodDecorator[] = []

  if (!exclude.includes(400)) {
    decorators.push(ApiResponse(VALIDATION_ERROR_RESPONSE))
  }

  if (!exclude.includes(401)) {
    decorators.push(ApiResponse(UNAUTHORIZED_RESPONSE))
  }

  if (!exclude.includes(403)) {
    decorators.push(ApiResponse(FORBIDDEN_RESPONSE))
  }

  if (!exclude.includes(500)) {
    decorators.push(ApiResponse(INTERNAL_SERVER_ERROR_RESPONSE))
  }

  return applyDecorators(...decorators)
}

/**
 * Respuesta exitosa para GET (200)
 *
 * @param type - Tipo de dato que se retorna (DTO)
 * @param description - Descripción personalizada (opcional)
 * @param isArray - Si retorna un array (opcional, default: false)
 *
 * @example
 * @ApiOkResponse(UserDto)
 * async findOne() {}
 *
 * @example
 * @ApiOkResponse(UserDto, 'Usuario encontrado exitosamente', true)
 * async findAll() {}
 */
export function ApiOkResponse<T>(
  type: Type<T>,
  description = 'Operación exitosa',
  isArray = false,
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 200,
      description,
      schema: isArray
        ? {
            type: 'array',
            items: { $ref: getSchemaPath(type) },
          }
        : {
            $ref: getSchemaPath(type),
          },
    }),
  )
}

/**
 * Respuesta exitosa para POST (201)
 *
 * @param type - Tipo de dato que se retorna (DTO)
 * @param description - Descripción personalizada (opcional)
 *
 * @example
 * @ApiCreatedResponse(UserDto)
 * async create() {}
 *
 * @example
 * @ApiCreatedResponse(UserDto, 'Usuario creado exitosamente')
 * async create() {}
 */
export function ApiCreatedResponse<T>(
  type: Type<T>,
  description = 'Recurso creado exitosamente',
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 201,
      description,
      schema: {
        $ref: getSchemaPath(type),
      },
    }),
  )
}

/**
 * Respuesta exitosa para PUT/PATCH (200)
 *
 * @param type - Tipo de dato que se retorna (DTO)
 * @param description - Descripción personalizada (opcional)
 *
 * @example
 * @ApiUpdatedResponse(UserDto)
 * async update() {}
 */
export function ApiUpdatedResponse<T>(
  type: Type<T>,
  description = 'Recurso actualizado exitosamente',
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 200,
      description,
      schema: {
        $ref: getSchemaPath(type),
      },
    }),
  )
}

/**
 * Respuesta exitosa para DELETE (200 o 204)
 *
 * @param description - Descripción personalizada (opcional)
 * @param noContent - Si retorna 204 sin contenido (opcional, default: false)
 *
 * @example
 * @ApiDeletedResponse()
 * async remove() {}
 *
 * @example
 * @ApiDeletedResponse('Usuario eliminado', true)
 * async remove() {}
 */
export function ApiDeletedResponse(
  description = 'Recurso eliminado exitosamente',
  noContent = false,
): MethodDecorator {
  return ApiResponse({
    status: noContent ? 204 : 200,
    description,
    schema: noContent
      ? undefined
      : {
          type: 'object',
          properties: {
            message: { type: 'string', example: description },
          },
        },
  })
}

/**
 * Respuesta de conflicto (409)
 *
 * @param description - Descripción del conflicto
 *
 * @example
 * @ApiConflictResponse('Ya existe un usuario con ese email')
 * async create() {}
 */
export function ApiConflictResponse(
  description = 'Conflicto - El recurso ya existe',
): MethodDecorator {
  return ApiResponse({
    ...CONFLICT_RESPONSE,
    description,
  })
}

/**
 * Respuesta de recurso no encontrado (404)
 *
 * @param description - Descripción personalizada (opcional)
 *
 * @example
 * @ApiNotFoundResponse('Usuario no encontrado')
 * async findOne() {}
 */
export function ApiNotFoundResponse(
  description = 'Recurso no encontrado',
): MethodDecorator {
  return ApiResponse({
    ...NOT_FOUND_RESPONSE,
    description,
  })
}

/**
 * Combina respuestas para endpoints de CRUD Create (POST)
 *
 * Incluye:
 * - 201: Recurso creado
 * - 400: Validación
 * - 401: No autenticado
 * - 403: Sin permisos
 * - 409: Conflicto
 * - 500: Error interno
 *
 * @param type - Tipo de dato que se retorna
 * @param conflictDescription - Descripción del conflicto (opcional)
 *
 * @example
 * @ApiCreateResponses(UserDto, 'Usuario con ese email ya existe')
 * async create() {}
 */
export function ApiCreateResponses<T>(
  type: Type<T>,
  conflictDescription = 'El recurso ya existe',
): MethodDecorator {
  return applyDecorators(
    ApiCreatedResponse(type),
    ApiConflictResponse(conflictDescription),
    ApiStandardResponses(),
  )
}

/**
 * Combina respuestas para endpoints de CRUD Read/List (GET)
 *
 * Incluye:
 * - 200: Operación exitosa
 * - 400: Validación (si aplica)
 * - 401: No autenticado
 * - 403: Sin permisos
 * - 500: Error interno
 *
 * @param type - Tipo de dato que se retorna
 * @param isArray - Si retorna un array (opcional, default: true)
 *
 * @example
 * @ApiReadResponses(UserDto, true)
 * async findAll() {}
 *
 * @example
 * @ApiReadResponses(UserDto, false)
 * async findOne() {}
 */
export function ApiReadResponses<T>(
  type: Type<T>,
  isArray = true,
): MethodDecorator {
  return applyDecorators(
    ApiOkResponse(type, 'Operación exitosa', isArray),
    ApiStandardResponses(),
  )
}

/**
 * Combina respuestas para endpoints de CRUD Update (PUT/PATCH)
 *
 * Incluye:
 * - 200: Recurso actualizado
 * - 400: Validación
 * - 401: No autenticado
 * - 403: Sin permisos
 * - 404: No encontrado
 * - 409: Conflicto (opcional)
 * - 500: Error interno
 *
 * @param type - Tipo de dato que se retorna
 * @param includeConflict - Si incluir respuesta de conflicto (opcional)
 *
 * @example
 * @ApiUpdateResponses(UserDto)
 * async update() {}
 *
 * @example
 * @ApiUpdateResponses(UserDto, true)
 * async update() {}
 */
export function ApiUpdateResponses<T>(
  type: Type<T>,
  includeConflict = false,
): MethodDecorator {
  const decorators: MethodDecorator[] = [
    ApiUpdatedResponse(type),
    ApiNotFoundResponse(),
    ApiStandardResponses(),
  ]

  if (includeConflict) {
    decorators.splice(2, 0, ApiConflictResponse())
  }

  return applyDecorators(...decorators)
}

/**
 * Combina respuestas para endpoints de CRUD Delete (DELETE)
 *
 * Incluye:
 * - 200/204: Recurso eliminado
 * - 401: No autenticado
 * - 403: Sin permisos
 * - 404: No encontrado
 * - 500: Error interno
 *
 * @param noContent - Si retorna 204 sin contenido (opcional, default: false)
 *
 * @example
 * @ApiDeleteResponses()
 * async remove() {}
 *
 * @example
 * @ApiDeleteResponses(true)
 * async remove() {}
 */
export function ApiDeleteResponses(noContent = false): MethodDecorator {
  return applyDecorators(
    ApiDeletedResponse(undefined, noContent),
    ApiNotFoundResponse(),
    ApiStandardResponses({ exclude: [400] }), // No hay validación en DELETE
  )
}
