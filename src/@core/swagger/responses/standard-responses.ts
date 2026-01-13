/**
 * Standard API Response Definitions
 *
 * Definiciones reutilizables de respuestas HTTP estándar para Swagger.
 * Estos objetos se usan en los decoradores personalizados.
 */

import { HttpStatus } from '@nestjs/common'

/**
 * Estructura de error estándar
 */
export interface ErrorResponse {
  statusCode: number
  message: string | string[]
  error: string
  timestamp?: string
  path?: string
}

/**
 * Respuestas de validación (400)
 */
export const VALIDATION_ERROR_RESPONSE = {
  status: HttpStatus.BAD_REQUEST,
  description: 'Datos de entrada inválidos',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      message: {
        type: 'array',
        items: { type: 'string' },
        example: [
          'El campo nombres debe tener al menos 2 caracteres',
          'El campo correo electrónico debe ser una dirección de correo electrónico válida',
        ],
      },
      error: { type: 'string', example: 'Bad Request' },
    },
  },
}

/**
 * Respuestas de autenticación (401)
 */
export const UNAUTHORIZED_RESPONSE = {
  status: HttpStatus.UNAUTHORIZED,
  description: 'No autenticado - Token inválido o no proporcionado',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      message: { type: 'string', example: 'No autorizado' },
      error: { type: 'string', example: 'Unauthorized' },
    },
  },
}

/**
 * Respuestas de autorización (403)
 */
export const FORBIDDEN_RESPONSE = {
  status: HttpStatus.FORBIDDEN,
  description: 'Sin permisos - No tiene acceso a este recurso',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 403 },
      message: {
        type: 'string',
        example: 'No tiene permisos para realizar esta acción',
      },
      error: { type: 'string', example: 'Forbidden' },
    },
  },
}

/**
 * Respuestas de recurso no encontrado (404)
 */
export const NOT_FOUND_RESPONSE = {
  status: HttpStatus.NOT_FOUND,
  description: 'Recurso no encontrado',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 404 },
      message: { type: 'string', example: 'Recurso no encontrado' },
      error: { type: 'string', example: 'Not Found' },
    },
  },
}

/**
 * Respuestas de conflicto (409)
 */
export const CONFLICT_RESPONSE = {
  status: HttpStatus.CONFLICT,
  description: 'Conflicto - El recurso ya existe',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 409 },
      message: {
        type: 'string',
        example: 'El recurso ya existe',
      },
      error: { type: 'string', example: 'Conflict' },
    },
  },
}

/**
 * Respuestas de error interno (500)
 */
export const INTERNAL_SERVER_ERROR_RESPONSE = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: 'Error interno del servidor',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 500 },
      message: { type: 'string', example: 'Error interno del servidor' },
      error: { type: 'string', example: 'Internal Server Error' },
    },
  },
}
