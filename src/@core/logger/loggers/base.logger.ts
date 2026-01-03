import * as winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { LogLevel, BaseLogContext } from '../types'
import { colorFormatter, consoleFormatter, fileFormatter } from '../formatters'

export class BaseLogger {
  protected logger: winston.Logger

  constructor(private readonly loggerName: string) {
    this.logger = this.createLogger()
  }

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || LogLevel.INFO,
      defaultMeta: { service: this.loggerName },
      transports: [
        this.createConsoleTransport(),
        this.createErrorFileTransport(),
        this.createCombinedFileTransport(),
      ],
    })
  }

  private createConsoleTransport(): winston.transports.ConsoleTransportInstance {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        colorFormatter,
        consoleFormatter,
      ),
    })
  }

  private createErrorFileTransport(): DailyRotateFile {
    return new DailyRotateFile({
      filename: `logs/${this.loggerName}-error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: LogLevel.ERROR,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        fileFormatter,
      ),
    })
  }

  private createCombinedFileTransport(): DailyRotateFile {
    return new DailyRotateFile({
      filename: `logs/${this.loggerName}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        fileFormatter,
      ),
    })
  }

  private internalLog(
    level: LogLevel,
    message: string,
    context?: Partial<BaseLogContext>,
  ): void {
    this.logger.log(level, message, {
      ...context,
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
