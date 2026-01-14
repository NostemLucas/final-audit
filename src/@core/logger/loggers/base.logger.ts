import * as winston from 'winston'
import { LogLevel, BaseLogContext } from '../types'

/**
 * BaseLogger - Clase base para todos los loggers especializados
 *
 * MEJORA:
 * Ahora recibe la instancia de Winston compartida en lugar de crear la suya propia.
 * Esto reduce el consumo de memoria y file handles abiertos.
 */
export class BaseLogger {
  protected logger: winston.Logger

  constructor(
    logger: winston.Logger,
    private readonly loggerName: string,
  ) {
    this.logger = logger
  }

  private internalLog(
    level: LogLevel,
    message: string,
    context?: Partial<BaseLogContext>,
  ): void {
    this.logger.log(level, message, {
      ...context,
      service: this.loggerName, // Pasar el nombre del logger como metadata
      timestamp: new Date().toISOString(),
    })
  }

  protected writeLog(
    level: LogLevel,
    message: string,
    context?: Partial<BaseLogContext>,
  ): void {
    this.internalLog(level, message, context)
  }

  info(message: string, context?: Partial<BaseLogContext>): void {
    this.writeLog(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Partial<BaseLogContext>): void {
    this.writeLog(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Partial<BaseLogContext>): void {
    this.writeLog(LogLevel.ERROR, message, context)
  }

  debug(message: string, context?: Partial<BaseLogContext>): void {
    this.writeLog(LogLevel.DEBUG, message, context)
  }

  verbose(message: string, context?: Partial<BaseLogContext>): void {
    this.writeLog(LogLevel.VERBOSE, message, context)
  }
}
