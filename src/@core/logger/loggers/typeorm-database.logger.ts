import { Injectable } from '@nestjs/common'
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm'
import { format } from 'sql-formatter'
import { BaseLogger } from './base.logger'
import { DatabaseLogContext, UserContext, LogLevel } from '../types'
import { WinstonProvider } from '../providers'

interface DatabaseError {
  code?: string
  message: string
  meta?: Record<string, unknown>
  clientVersion?: string
}

@Injectable()
export class TypeOrmDatabaseLogger extends BaseLogger implements TypeOrmLogger {
  private readonly slowQueryThreshold = 1000
  private readonly enableQueryFormatting = true

  constructor(winstonProvider: WinstonProvider) {
    super(winstonProvider.getLogger(), 'database')
  }

  /**
   * Crea una instancia standalone (fuera del contexto de NestJS)
   * Útil para configuración de TypeORM en archivos de config
   */
  static createStandalone(): TypeOrmDatabaseLogger {
    const provider = new WinstonProvider()
    return new TypeOrmDatabaseLogger(provider)
  }

  /**
   * Formatea una query SQL para mejor legibilidad
   */
  private formatQuery(query: string, parameters?: unknown[]): string {
    try {
      const formattedQuery = this.enableQueryFormatting
        ? format(query, {
            language: 'postgresql',
            tabWidth: 2,
            keywordCase: 'upper',
            linesBetweenQueries: 2,
          })
        : query

      const queryWithParams = parameters?.length
        ? `${formattedQuery}\n-- Parameters: ${JSON.stringify(parameters)}`
        : formattedQuery

      return queryWithParams
    } catch {
      // Si hay error al formatear, devolver query original
      return parameters?.length
        ? `${query} -- Parameters: ${JSON.stringify(parameters)}`
        : query
    }
  }

  /**
   * Logs query and parameters used in it.
   */
  logQuery(query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    const formattedQuery = this.formatQuery(query, parameters)

    // Detectar si la query está dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: 'QUERY' + transactionMarker,
        errorMessage: '',
      },
      query: formattedQuery,
      additionalData: {
        duration: '0ms',
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(LogLevel.DEBUG, 'Database Query Executed', context)
  }

  /**
   * Logs query that is failed.
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ) {
    const errorMessage = error instanceof Error ? error.message : error
    const formattedQuery = this.formatQuery(query, parameters)

    // Detectar si el error ocurrió dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: 'QUERY_EXECUTION' + transactionMarker,
        errorCode: 'QUERY_ERROR',
        errorMessage,
      },
      query: formattedQuery,
      additionalData: {
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(
      LogLevel.ERROR,
      `Database Error: QUERY_EXECUTION - ${errorMessage}`,
      context,
    )
  }

  /**
   * Logs query that is slow.
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ) {
    const formattedQuery = this.formatQuery(query, parameters)

    // Detectar si la slow query está dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: 'SLOW_QUERY' + transactionMarker,
        errorMessage: '',
      },
      query: formattedQuery,
      additionalData: {
        duration: `${time}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
        exceeded: `${time - this.slowQueryThreshold}ms`,
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(
      LogLevel.WARN,
      `Slow Query Detected: ${time}ms (threshold: ${this.slowQueryThreshold}ms)`,
      context,
    )
  }

  /**
   * Logs events from the schema build process.
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    // Detectar si el schema build está dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: 'SCHEMA_BUILD' + transactionMarker,
        errorMessage: '',
      },
      additionalData: {
        message,
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(LogLevel.INFO, `[SCHEMA BUILD] ${message}`, context)
  }

  /**
   * Logs events from the migrations run process.
   */
  logMigration(message: string, queryRunner?: QueryRunner) {
    // Detectar si la migración está dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: 'MIGRATION' + transactionMarker,
        errorMessage: '',
      },
      additionalData: {
        message,
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(LogLevel.INFO, `[MIGRATION] ${message}`, context)
  }

  /**
   * Perform logging using given logger, or by default to the console.
   * Log has its own level and message.
   * Este método cumple con la interfaz Logger de TypeORM
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: string | number | boolean,
    queryRunner?: QueryRunner,
  ) {
    // Convertir nivel de TypeORM a nuestro LogLevel
    let logLevel: LogLevel
    let operation = 'GENERAL'

    // Detectar tipo de operación basado en el mensaje
    const messageStr = String(message)
    if (messageStr.includes('schema') || messageStr.includes('Schema')) {
      operation = 'SCHEMA'
      logLevel = LogLevel.INFO
    } else if (
      messageStr.includes('migration') ||
      messageStr.includes('Migration')
    ) {
      operation = 'MIGRATION'
      logLevel = LogLevel.INFO
    } else {
      // Mapeo estándar de niveles
      switch (level) {
        case 'warn':
          logLevel = LogLevel.WARN
          break
        case 'info':
          logLevel = LogLevel.INFO
          break
        case 'log':
        default:
          logLevel = LogLevel.DEBUG
          break
      }
    }

    // Detectar si está dentro de una transacción
    const isTransaction = queryRunner?.isTransactionActive ?? false
    const transactionMarker = isTransaction ? ' [TRX]' : ''

    const context: DatabaseLogContext = {
      database: {
        operation: operation + transactionMarker,
        errorMessage: '',
      },
      additionalData: {
        originalLevel: level,
        inTransaction: isTransaction,
      },
    }

    this.internalWriteLog(logLevel, messageStr, context)
  }

  /**
   * Método interno para escribir logs con contexto completo
   */
  private internalWriteLog(
    level: LogLevel,
    message: string,
    context: DatabaseLogContext,
  ): void {
    super.writeLog(level, message, context)
  }

  // ========== MÉTODOS ADICIONALES ÚTILES ==========

  /**
   * Log de query normal con duración
   * Compatible con LoggerService
   */
  logQueryWithDuration(
    query: string,
    duration: number,
    user?: UserContext,
  ): void {
    const formattedQuery = this.formatQuery(query)

    const context: DatabaseLogContext = {
      user,
      database: {
        operation: 'QUERY',
        errorMessage: '',
      },
      query: formattedQuery,
      additionalData: {
        duration: `${duration}ms`,
      },
    }

    this.internalWriteLog(
      LogLevel.DEBUG,
      `Database Query Executed (${duration}ms)`,
      context,
    )
  }

  /**
   * Log de error general de base de datos
   */
  logDatabaseError(
    error: DatabaseError,
    operation: string,
    user?: UserContext,
    query?: string,
  ): void {
    const context: DatabaseLogContext = {
      user,
      database: {
        operation,
        errorCode: error.code,
        errorMessage: error.message,
        meta: error.meta,
      },
      query,
      additionalData: {
        clientVersion: error.clientVersion,
      },
    }

    this.internalWriteLog(
      LogLevel.ERROR,
      `Database Error: ${operation} - ${error.message}`,
      context,
    )
  }

  /**
   * Log de query lenta con threshold personalizado
   * Compatible con LoggerService
   */
  logSlowQueryWithThreshold(
    query: string,
    duration: number,
    threshold: number,
    user?: UserContext,
  ): void {
    const formattedQuery = this.formatQuery(query)

    const context: DatabaseLogContext = {
      user,
      database: {
        operation: 'SLOW_QUERY',
        errorMessage: '',
      },
      query: formattedQuery,
      additionalData: {
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        exceeded: `${duration - threshold}ms`,
      },
    }

    this.internalWriteLog(
      LogLevel.WARN,
      `Slow Query Detected: ${duration}ms (threshold: ${threshold}ms)`,
      context,
    )
  }

  /**
   * Log de conexión/desconexión
   */
  logConnection(event: 'connect' | 'disconnect', database?: string): void {
    const context: DatabaseLogContext = {
      database: {
        operation: event.toUpperCase(),
        errorMessage: '',
      },
      additionalData: {
        database,
        timestamp: new Date().toISOString(),
      },
    }

    const message =
      event === 'connect'
        ? `Database Connected${database ? ` to ${database}` : ''}`
        : `Database Disconnected${database ? ` from ${database}` : ''}`

    this.internalWriteLog(LogLevel.INFO, message, context)
  }

  // ========== MÉTODOS PARA COMPATIBILIDAD CON LoggerService ==========
  // Nota: No usamos "logQuery" como alias porque ya existe en la interfaz TypeORM

  /**
   * Log de error para LoggerService (alias de logDatabaseError)
   */
  logError(
    error: DatabaseError,
    operation: string,
    user?: UserContext,
    query?: string,
  ): void {
    this.logDatabaseError(error, operation, user, query)
  }

  /**
   * Log de slow query para LoggerService (alias de logSlowQueryWithThreshold)
   */
  logSlowQuery(
    query: string,
    duration: number,
    threshold: number,
    user?: UserContext,
  ): void {
    this.logSlowQueryWithThreshold(query, duration, threshold, user)
  }
}
