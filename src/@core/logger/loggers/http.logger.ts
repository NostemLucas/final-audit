import { Injectable } from '@nestjs/common'
import { Request, Response } from 'express'
import { BaseLogger } from './base.logger'
import { HttpLogContext, UserContext, LogLevel } from '../types'
import { UserAgentParser, DataSanitizer, IpExtractor } from '../utils'

@Injectable()
export class HttpLogger extends BaseLogger {
  constructor() {
    super('http')
  }

  logRequest(req: Request, user?: UserContext): void {
    const userAgent = req.headers['user-agent'] || 'Unknown'
    const device = UserAgentParser.parse(userAgent)
    const contentType = req.headers['content-type'] || 'Not specified'

    const context: HttpLogContext = {
      user,
      device,
      request: {
        method: req.method,
        url: req.url,
        ip: IpExtractor.extract(req),
        contentType,
        query: req.query as Record<string, unknown>,
        params: req.params as Record<string, unknown>,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        body: req.body ? DataSanitizer.sanitize(req.body) : undefined,
      },
    }

    this.writeLog(
      LogLevel.HTTP,
      `Incoming Request: ${req.method} ${req.url}`,
      context,
    )
  }

  logResponse(
    req: Request,
    res: Response,
    responseTime: number,
    user?: UserContext,
  ): void {
    const userAgent = req.headers['user-agent'] || 'Unknown'
    const device = UserAgentParser.parse(userAgent)

    const context: HttpLogContext = {
      user,
      device,
      request: {
        method: req.method,
        url: req.url,
        ip: IpExtractor.extract(req),
      },
      response: {
        statusCode: res.statusCode,
        responseTime,
      },
    }

    const level =
      res.statusCode >= 500
        ? LogLevel.ERROR
        : res.statusCode >= 400
          ? LogLevel.WARN
          : LogLevel.HTTP

    this.writeLog(
      level,
      `Outgoing Response: ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`,
      context,
    )
  }
}
