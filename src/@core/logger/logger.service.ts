import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common'
import { Request, Response } from 'express'
import {
  HttpLogger,
  ExceptionLogger,
  TypeOrmDatabaseLogger,
  StartupLogger,
} from './loggers'
import { UserContext } from './types'
import { JwtPayload } from 'src/modules/auth'

@Injectable()
export class LoggerService implements NestLoggerService {
  public readonly http: HttpLogger
  public readonly exception: ExceptionLogger
  public readonly database: TypeOrmDatabaseLogger
  public readonly startup: StartupLogger

  constructor(
    httpLogger: HttpLogger,
    exceptionLogger: ExceptionLogger,
    databaseLogger: TypeOrmDatabaseLogger,
    startupLogger: StartupLogger,
  ) {
    this.http = httpLogger
    this.exception = exceptionLogger
    this.database = databaseLogger
    this.startup = startupLogger
  }

  // ===== NESTJS LOGGER SERVICE INTERFACE =====
  log(message: string): void {
    this.http.info(message)
  }

  error(message: string, trace?: string): void {
    const error = new Error(message)
    if (trace) {
      error.stack = trace
    }
    this.exception.logUnhandledException(error)
  }

  warn(message: string): void {
    this.http.warn(message)
  }

  debug(message: string): void {
    this.http.debug(message)
  }

  verbose(message: string): void {
    this.http.verbose(message)
  }

  // ===== HTTP LOGGING =====
  logHttpRequest(req: Request, userContext?: Partial<UserContext>): void {
    const user = this.extractUserContext(req, userContext)
    this.http.logRequest(req, user)
  }

  logHttpResponse(
    req: Request,
    res: Response,
    responseTime: number,
    userContext?: Partial<UserContext>,
  ): void {
    const user = this.extractUserContext(req, userContext)
    this.http.logResponse(req, res, responseTime, user)
  }

  // ===== EXCEPTION LOGGING =====
  logException(
    error: Error,
    context?: {
      req?: Request
      user?: Partial<UserContext>
      additionalData?: Record<string, unknown>
    },
  ): void {
    const user = context?.user
      ? this.normalizeUserContext(context.user)
      : context?.req
        ? this.extractUserContext(context.req)
        : undefined

    this.exception.logException(
      error,
      context?.req,
      user,
      context?.additionalData,
    )
  }

  logUnhandledException(
    error: Error,
    additionalData?: Record<string, unknown>,
  ): void {
    this.exception.logUnhandledException(error, additionalData)
  }

  // ===== DATABASE LOGGING =====
  logDatabaseQuery(
    query: string,
    duration: number,
    userContext?: Partial<UserContext>,
  ): void {
    const user = userContext
      ? this.normalizeUserContext(userContext)
      : undefined
    this.database.logQueryWithDuration(query, duration, user)
  }

  logDatabaseError(
    error: {
      code?: string
      message: string
      meta?: Record<string, unknown>
      clientVersion?: string
    },
    operation: string,
    options?: {
      user?: Partial<UserContext>
      query?: string
    },
  ): void {
    const user = options?.user
      ? this.normalizeUserContext(options.user)
      : undefined
    this.database.logError(error, operation, user, options?.query)
  }

  logDatabaseConnection(
    event: 'connect' | 'disconnect',
    database?: string,
  ): void {
    this.database.logConnection(event, database)
  }

  logDatabaseSlowQuery(
    query: string,
    duration: number,
    threshold: number = 1000,
    userContext?: Partial<UserContext>,
  ): void {
    const user = userContext
      ? this.normalizeUserContext(userContext)
      : undefined
    this.database.logSlowQuery(query, duration, threshold, user)
  }

  // ===== HELPER METHODS =====
  private extractUserContext(
    req: Request,
    userContext?: Partial<UserContext>,
  ): UserContext | undefined {
    if (userContext && userContext.userId && userContext.userEmail) {
      return this.normalizeUserContext(userContext)
    }

    const user = req.user as unknown as JwtPayload | undefined

    // 4. Verificamos que el usuario exista y tenga los datos mínimos
    if (user && user.sub) {
      return {
        userId: user.sub,
        userEmail: user.email,
        userName: user.username,
      }
    }
    return undefined
  }
  private normalizeUserContext(
    partial: Partial<UserContext>,
  ): UserContext | undefined {
    if (!partial.userId || !partial.userEmail) {
      return undefined
    }

    return {
      userId: partial.userId,
      userEmail: partial.userEmail,
      userName: partial.userName,
    }
  }
}
