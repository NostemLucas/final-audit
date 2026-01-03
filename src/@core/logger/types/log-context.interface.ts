export interface UserContext {
  userId: string
  userEmail: string
  userName?: string
}

export interface DeviceInfo {
  os: string
  browser: string
  device: string
  userAgent: string
}

export interface HttpRequestContext {
  method: string
  url: string
  ip: string
  contentType?: string
  query?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
}

export interface HttpResponseContext {
  statusCode: number
  responseTime: number
}

export interface ErrorContext {
  name: string
  message: string
  stack?: string
  code?: string
}

export interface DatabaseErrorContext {
  operation: string
  errorCode?: string
  errorMessage: string
  meta?: Record<string, unknown>
}

export interface BaseLogContext {
  timestamp?: string
  correlationId?: string
  service?: string
  environment?: string
}

export interface HttpLogContext extends BaseLogContext {
  user?: UserContext
  device?: DeviceInfo
  request?: HttpRequestContext
  response?: HttpResponseContext
}

export interface ExceptionLogContext extends BaseLogContext {
  user?: UserContext
  request?: HttpRequestContext
  error: ErrorContext
  additionalData?: Record<string, unknown>
}

export interface DatabaseLogContext extends BaseLogContext {
  user?: UserContext
  database: DatabaseErrorContext
  query?: string
  additionalData?: Record<string, unknown>
}
