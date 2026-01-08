import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { LoggerService } from '../logger/logger.service'

interface RequestWithUser extends Request {
  user?: {
    id: string
    email: string
    username?: string
  }
}

interface ErrorResponse {
  statusCode: number
  timestamp: string
  path: string
  method: string
  message: string | string[]
  error?: string
  details?: unknown
}

/**
 * Filtro global de excepciones que captura todos los errores
 * de la aplicación, los loguea y formatea la respuesta al cliente
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<RequestWithUser>()

    // Determinar el status code y mensaje
    const { statusCode, message, error, details } =
      this.parseException(exception)

    // Construir contexto de usuario
    const userContext = request.user
      ? {
          userId: request.user.id,
          userEmail: request.user.email,
          userName: request.user.username,
        }
      : undefined

    // Loguear la excepción
    if (exception instanceof Error) {
      this.logger.logException(exception, {
        req: request,
        user: userContext,
        additionalData: {
          statusCode,
          path: request.url,
          method: request.method,
        },
      })
    } else {
      // Si no es un Error, loguear como unhandled
      this.logger.logUnhandledException(
        new Error(
          typeof exception === 'string' ? exception : 'Unknown exception',
        ),
        {
          originalException: exception,
          statusCode,
          path: request.url,
          method: request.method,
          user: userContext,
        },
      )
    }

    // Construir respuesta de error
    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    }

    // Agregar detalles solo en desarrollo
    if (details && process.env.NODE_ENV !== 'production') {
      errorResponse.details = details
    }

    // Enviar respuesta
    response.status(statusCode).json(errorResponse)
  }

  /**
   * Parsea la excepción y extrae información útil
   */
  private parseException(exception: unknown): {
    statusCode: number
    message: string | string[]
    error: string
    details?: unknown
  } {
    // HttpException de NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse()

      // Si la respuesta es un objeto con mensaje
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>
        return {
          statusCode: status,
          message:
            (responseObj.message as string | string[]) || exception.message,
          error: (responseObj.error as string) || exception.name,
          details:
            process.env.NODE_ENV !== 'production' ? responseObj : undefined,
        }
      }

      // Si la respuesta es un string
      return {
        statusCode: status,
        message: typeof response === 'string' ? response : exception.message,
        error: exception.name,
      }
    }

    // Error estándar de JavaScript
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        error: exception.name || 'Error',
        details:
          process.env.NODE_ENV !== 'production'
            ? {
                stack: exception.stack,
              }
            : undefined,
      }
    }

    // Excepción desconocida
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'UnknownError',
      details: process.env.NODE_ENV !== 'production' ? exception : undefined,
    }
  }
}
