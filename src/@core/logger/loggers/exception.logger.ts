import { Injectable, HttpException } from '@nestjs/common'
import { Request } from 'express'
import { BaseLogger } from './base.logger'
import {
  ExceptionLogContext,
  UserContext,
  ErrorContext,
  LogLevel,
} from '../types'
import { IpExtractor } from '../utils'

@Injectable()
export class ExceptionLogger extends BaseLogger {
  constructor() {
    super('exception')
  }

  logException(
    error: Error | HttpException,
    req?: Request,
    user?: UserContext,
    additionalData?: Record<string, unknown>,
  ): void {
    const errorContext: ErrorContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }

    // Si es una excepción HTTP, agregar el código de estado
    if (error instanceof HttpException) {
      errorContext.code = error.getStatus().toString()
    }

    const context: ExceptionLogContext = {
      user,
      error: errorContext,
      additionalData,
    }

    // Agregar información del request si está disponible
    if (req) {
      context.request = {
        method: req.method,
        url: req.url,
        ip: IpExtractor.extract(req),
      }
    }

    const level =
      error instanceof HttpException && error.getStatus() < 500
        ? LogLevel.WARN
        : LogLevel.ERROR

    this.writeLog(level, `Exception: ${error.name} - ${error.message}`, context)
  }

  logUnhandledException(
    error: Error,
    additionalData?: Record<string, unknown>,
  ): void {
    const context: ExceptionLogContext = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      additionalData,
    }

    this.writeLog(
      LogLevel.ERROR,
      `Unhandled Exception: ${error.name} - ${error.message}`,
      context,
    )
  }
}
