# Logger Service - Guía de Uso

Sistema completo de logging con Winston para NestJS.

## Dependencias Instaladas

- ✅ **winston** - Sistema de logging principal
- ✅ **winston-daily-rotate-file** - Rotación automática de archivos de logs
- ✅ **chalk** - Colores en consola

## Características

- 📝 Múltiples niveles de log (error, warn, info, http, debug, etc.)
- 🎨 Logs con colores en consola
- 📁 Rotación automática de archivos de log
- 🔍 Contexto de usuario, requests HTTP, base de datos
- 🛡️ Sanitización automática de datos sensibles
- 📊 Logs estructurados en formato JSON

## Instalación en tu Módulo

### 1. Importar el LoggerModule

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from './shared/logger/logger.module'

@Module({
  imports: [
    LoggerModule,
    // otros módulos...
  ],
})
export class AppModule {}
```

### 2. Inyectar el LoggerService

```typescript
import { Injectable } from '@nestjs/common'
import { LoggerService } from './shared/logger/logger.service'

@Injectable()
export class NotificationsService {
  constructor(private readonly logger: LoggerService) {}

  async sendNotification() {
    this.logger.log('Sending notification...')
    // tu lógica aquí
  }
}
```

## Uso Básico

### Logs Generales

```typescript
// Info
this.logger.log('Aplicación iniciada')

// Warning
this.logger.warn('Memoria alta: 85%')

// Error
this.logger.error('Error al conectar a BD', error.stack)

// Debug
this.logger.debug('Variable X:', { value: 123 })

// Verbose
this.logger.verbose('Detalles de configuración')
```

### HTTP Logging

```typescript
import { Controller, Get, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'

@Controller('api')
export class ApiController {
  constructor(private readonly logger: LoggerService) {}

  @Get('users')
  async getUsers(@Req() req: Request, @Res() res: Response) {
    // Log de request entrante
    this.logger.logHttpRequest(req, {
      userId: '123',
      userEmail: 'user@example.com',
    })

    const startTime = Date.now()
    const users = await this.userService.findAll()

    // Log de response saliente
    const responseTime = Date.now() - startTime
    res.json(users)
    this.logger.logHttpResponse(req, res, responseTime)
  }
}
```

### Exception Logging

```typescript
try {
  await this.riskyOperation()
} catch (error) {
  // Log de excepción con contexto
  this.logger.logException(error, {
    req: request,
    user: { userId: '123', userEmail: 'user@example.com' },
    additionalData: {
      operation: 'riskyOperation',
      params: { id: 456 },
    },
  })

  throw error
}
```

### Database Logging

```typescript
// Log de query
const startTime = Date.now()
const result = await this.repository.find()
const duration = Date.now() - startTime

this.logger.logDatabaseQuery(
  'SELECT * FROM users WHERE active = true',
  duration,
  { userId: '123', userEmail: 'user@example.com' },
)

// Log de query lenta (> 1000ms)
this.logger.logDatabaseSlowQuery(
  'SELECT * FROM large_table JOIN ...',
  1500, // duración en ms
  1000, // threshold
  { userId: '123', userEmail: 'user@example.com' },
)

// Log de error de base de datos
this.logger.logDatabaseError(
  {
    code: 'P2002',
    message: 'Unique constraint failed',
    meta: { target: ['email'] },
  },
  'createUser',
  {
    user: { userId: '123', userEmail: 'user@example.com' },
    query: 'INSERT INTO users ...',
  },
)

// Log de conexión/desconexión
this.logger.logDatabaseConnection('connect', 'notifications_db')
this.logger.logDatabaseConnection('disconnect', 'notifications_db')
```

## Loggers Especializados

El LoggerService expone 4 loggers especializados:

### 1. HTTP Logger

```typescript
// Acceso directo
this.logger.http.info('Processing request')
this.logger.http.warn('Rate limit approaching')
this.logger.http.error('Request failed')
```

### 2. Exception Logger

```typescript
// Log de excepción no manejada
this.logger.exception.logUnhandledException(error, {
  context: 'GlobalExceptionFilter',
})
```

### 3. Database Logger

```typescript
// Uso directo
this.logger.database.info('Database migration started')
this.logger.database.warn('Connection pool exhausted')
```

### 4. Startup Logger

```typescript
// En main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = app.get(LoggerService)

  logger.startup.info('Application starting...')
  logger.startup.success('Database connected')
  logger.startup.warn('Running in development mode')
  logger.startup.error('Failed to connect to Redis')

  await app.listen(3000)
  logger.startup.success(`Application listening on port 3000`)
}
```

## Middleware para Logging Automático

Crea un middleware para loggear todas las requests automáticamente:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { LoggerService } from './shared/logger/logger.service'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()

    // Log request
    this.logger.logHttpRequest(req)

    // Log response cuando termine
    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      this.logger.logHttpResponse(req, res, responseTime)
    })

    next()
  }
}
```

Registra el middleware:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
```

## Exception Filter con Logger

```typescript
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { LoggerService } from './shared/logger/logger.service'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500

    // Log la excepción
    this.logger.logException(exception as Error, { req: request })

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
```

## Configuración de Archivos de Log

Los logs se guardan automáticamente en:

- `logs/combined-%DATE%.log` - Todos los logs
- `logs/error-%DATE%.log` - Solo errores
- `logs/http-%DATE%.log` - Solo requests HTTP

Rotación automática:

- Un archivo nuevo cada día
- Formato: `YYYY-MM-DD`
- Máximo 30 días de logs
- Máximo 20MB por archivo

## Sanitización de Datos

El logger automáticamente sanitiza datos sensibles:

```typescript
// Campos sensibles son ocultados automáticamente
const user = {
  name: 'John',
  email: 'john@example.com',
  password: 'secret123', // → '***'
  token: 'abc123', // → '***'
  apiKey: 'key123', // → '***'
  creditCard: '1234-5678', // → '***'
}

this.logger.log('User data', user)
// La contraseña, token, etc. se mostrarán como '***'
```

## Extracción de IP

El logger automáticamente extrae la IP real del cliente, considerando:

- `x-forwarded-for`
- `x-real-ip`
- Proxies y load balancers

## User Agent Parsing

Automáticamente parsea el user agent para extraer:

- Navegador
- Sistema operativo
- Tipo de dispositivo

## Uso en main.ts

```typescript
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { LoggerService } from './shared/logger/logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Usar el logger personalizado
  const logger = app.get(LoggerService)
  app.useLogger(logger)

  // Logs de startup
  logger.startup.info('Initializing application...')

  // Configuraciones
  const port = process.env.PORT || 3000

  await app.listen(port)

  logger.startup.success(`Application is running on: http://localhost:${port}`)
}
bootstrap()
```

## Ejemplo Completo

```typescript
import { Injectable } from '@nestjs/common'
import { LoggerService } from './shared/logger/logger.service'

@Injectable()
export class NotificationsService {
  constructor(private readonly logger: LoggerService) {}

  async createNotification(data: any) {
    this.logger.log('Creating notification')

    try {
      // Log de query
      const startTime = Date.now()
      const notification = await this.repository.save(data)
      const duration = Date.now() - startTime

      this.logger.logDatabaseQuery('INSERT INTO notifications ...', duration, {
        userId: data.userId,
        userEmail: data.userEmail,
      })

      this.logger.log('Notification created successfully', {
        notificationId: notification.id,
      })

      return notification
    } catch (error) {
      this.logger.logException(error, {
        additionalData: { operation: 'createNotification', data },
      })

      throw error
    }
  }
}
```

## Niveles de Log

- `ERROR` - Errores críticos
- `WARN` - Advertencias
- `INFO` - Información general (default)
- `HTTP` - Requests HTTP
- `VERBOSE` - Información detallada
- `DEBUG` - Debugging
- `SILLY` - Todo (muy detallado)

## Variables de Entorno

```env
# Nivel de log (opcional, default: info)
LOG_LEVEL=info

# Desactivar logs de consola (opcional)
LOG_DISABLE_CONSOLE=false

# Desactivar logs de archivo (opcional)
LOG_DISABLE_FILE=false
```

## Buenas Prácticas

1. **Usa contextos de usuario** cuando sea posible
2. **No loggees datos sensibles** (contraseñas, tokens, etc.) - el logger los sanitiza automáticamente
3. **Loggea excepciones** con contexto completo
4. **Loggea queries lentas** para optimización
5. **Usa el nivel apropiado** de log
6. **Incluye IDs de correlación** en logs relacionados

## Troubleshooting

### Los logs no aparecen

Verifica que el LoggerModule esté importado:

```typescript
imports: [LoggerModule]
```

### Los archivos de log no se crean

Verifica permisos de escritura en la carpeta `logs/`

### Colores no aparecen en consola

Los colores solo funcionan en TTY (terminal interactivo)
