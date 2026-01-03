# 📖 Guía de Uso del Logger - Ejemplos Prácticos

Esta guía cubre todos los casos de uso del sistema de logging con ejemplos prácticos y reales.

---

## 🚀 Inicio Rápido

### 1. Importar el Módulo (Una Sola Vez)

En tu `app.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from '@core/logger/logger.module'

@Module({
  imports: [
    LoggerModule,  // Módulo global, solo importar aquí
    // ... otros módulos
  ],
})
export class AppModule {}
```

### 2. Inyectar el Logger en tus Servicios

```typescript
import { Injectable } from '@nestjs/common'
import { LoggerService } from '@core/logger/logger.service'

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async findAll() {
    this.logger.http.info('Fetching all users')
    const users = await this.repository.find()
    return users
  }
}
```

### 3. Configurar en main.ts

```typescript
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { LoggerService } from '@core/logger/logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Usar el logger personalizado
  const logger = app.get(LoggerService)
  app.useLogger(logger)

  const port = process.env.PORT || 3001

  // Mostrar banner de inicio
  logger.startup.printStartupBanner(
    {
      appName: 'Audit API',
      version: '1.0.0',
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
      apiPrefix: '/api/docs',
    },
    {
      type: 'PostgreSQL',
      host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0],
      database: process.env.DATABASE_URL?.split('/').pop(),
    }
  )

  await app.listen(port)
}
bootstrap()
```

---

## 📝 Logging Básico

### Métodos Disponibles

```typescript
// Información general
this.logger.log('Server started')
this.logger.info('User logged in')

// Advertencias
this.logger.warn('Memory usage high: 85%')

// Errores (con stack trace opcional)
this.logger.error('Failed to connect to database', error.stack)

// Debug (solo visible con LOG_LEVEL=debug)
this.logger.debug('Processing data:', { items: 10 })

// Verbose (muy detallado)
this.logger.verbose('Configuration loaded:', config)
```

### Ejemplos Reales

#### Servicio de Usuarios

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating new user: ${createUserDto.email}`)

    try {
      const user = this.userRepository.create(createUserDto)
      const savedUser = await this.userRepository.save(user)

      this.logger.log(`User created successfully with ID: ${savedUser.id}`)
      return savedUser
    } catch (error) {
      this.logger.error(`Failed to create user: ${createUserDto.email}`, error.stack)
      throw error
    }
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.warn(`Deleting user with ID: ${id}`)
    await this.userRepository.delete(id)
    this.logger.warn(`User ${id} deleted`)
  }
}
```

---

## 🌐 HTTP Logging (Automático)

### Con Interceptor Global

El `LoggingInterceptor` ya está configurado globalmente y logea automáticamente todas las requests.

**app.module.ts:**
```typescript
import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { LoggingInterceptor } from '@core/interceptors/logging.interceptor'

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

### Logging Manual de HTTP

Si necesitas logging manual adicional:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly logger: LoggerService) {}

  @Post()
  async create(@Req() req: Request, @Res() res: Response, @Body() dto: CreateUserDto) {
    const startTime = Date.now()

    // Log del request (opcional, el interceptor ya lo hace)
    this.logger.logHttpRequest(req, {
      userId: req.user?.id,
      userEmail: req.user?.email,
    })

    const user = await this.userService.create(dto)

    const responseTime = Date.now() - startTime
    res.json(user)

    // Log del response
    this.logger.logHttpResponse(req, res, responseTime, {
      userId: req.user?.id,
      userEmail: req.user?.email,
    })
  }
}
```

### Output del HTTP Logger

```
22:53:15 → HTTP [http] Incoming Request: GET /api/users 👤 admin@example.com
  ┌─ Request:
  │ Endpoint: GET /api/users
  │ IP: 192.168.1.100
  │ Content-Type: application/json
  │ Query: {"page":"1","limit":"10"}
  └─
  ┌─ Device:
  │ Browser: Chrome
  │ OS: Windows
  │ Device: Desktop
  └─

22:53:15 → HTTP [http] Outgoing Response: GET /api/users 200 45ms
  ┌─ Request:
  │ Endpoint: GET /api/users
  │ IP: 192.168.1.100
  └─
  ┌─ Response:
  │ Status: 200
  │ Time: 45ms
  └─
```

---

## 🗄️ Database Logging

### Configuración con TypeORM

**app.module.ts:**
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TypeOrmDatabaseLogger } from '@core/logger/loggers/typeorm-database.logger'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      // ... otras configuraciones
      logger: new TypeOrmDatabaseLogger(1000, true), // threshold 1000ms, formatear SQL
      logging: ['query', 'error', 'warn', 'schema'],
    }),
  ],
})
export class AppModule {}
```

### Logging Manual de Queries

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findUserOrders(userId: string): Promise<Order[]> {
    const startTime = Date.now()

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .getMany()

    const duration = Date.now() - startTime

    // Log de la query con duración
    this.logger.logDatabaseQuery(
      `SELECT * FROM orders WHERE user_id = '${userId}'`,
      duration,
      { userId, userEmail: 'user@example.com' }
    )

    // Advertir si la query fue lenta
    if (duration > 1000) {
      this.logger.logDatabaseSlowQuery(
        `SELECT * FROM orders WHERE user_id = '${userId}'`,
        duration,
        1000,
        { userId, userEmail: 'user@example.com' }
      )
    }

    return orders
  }
}
```

### Logging de Errores de Base de Datos

```typescript
async createOrder(data: CreateOrderDto): Promise<Order> {
  try {
    const order = await this.orderRepository.save(data)
    return order
  } catch (error) {
    // Log específico de error de base de datos
    this.logger.logDatabaseError(
      {
        code: error.code,
        message: error.message,
        meta: { constraint: error.constraint },
      },
      'createOrder',
      {
        user: { userId: data.userId, userEmail: data.userEmail },
        query: 'INSERT INTO orders ...',
      }
    )

    throw error
  }
}
```

### Output del Database Logger

```
10:30:45 ⚙ DEBUG [database] Database Query Executed (45ms) [QUERY]
────────────────────────────────────────────────────────────────────────────────
  │ SELECT
  │   o.id,
  │   o.total,
  │   o.status,
  │   u.email AS user_email
  │ FROM
  │   orders o
  │   INNER JOIN users u ON u.id = o.user_id
  │ WHERE
  │   o.status = $1
  │   AND o.created_at >= $2
  │ ORDER BY
  │   o.created_at DESC
  │ LIMIT $3
  │ -- Parameters: ["pending","2026-01-01T00:00:00.000Z",10]
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 45ms
  └─
```

### Slow Query Warning

```
14:15:30 ⚠ WARN [database] Slow Query Detected: 1500ms (threshold: 1000ms) [SLOW_QUERY]
────────────────────────────────────────────────────────────────────────────────
  │ SELECT
  │   *
  │ FROM
  │   large_table
  │ WHERE
  │   complex_condition = $1
  │ -- Parameters: [true]
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 1500ms
  │ threshold: 1000ms
  │ exceeded: 500ms
  └─
```

---

## ⚠️ Exception Logging

### Exception Filter Global

**all-exceptions.filter.ts:**
```typescript
import { Catch, ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { LoggerService } from '@core/logger/logger.service'
import { Request, Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error'

    // Log la excepción con contexto completo
    this.logger.logException(exception as Error, {
      req: request,
      user: request.user
        ? {
            userId: request.user.id,
            userEmail: request.user.email,
          }
        : undefined,
      additionalData: {
        statusCode: status,
        path: request.url,
        method: request.method,
      },
    })

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
```

**Registrar globalmente:**
```typescript
import { APP_FILTER } from '@nestjs/core'

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

### Logging Manual de Excepciones

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {}

  async processPayment(orderId: string, amount: number): Promise<void> {
    try {
      // Operación riesgosa
      await this.paymentGateway.charge(amount)
    } catch (error) {
      // Log de excepción con contexto
      this.logger.logException(error as Error, {
        additionalData: {
          operation: 'processPayment',
          orderId,
          amount,
          gateway: 'stripe',
        },
      })

      throw new Error('Payment processing failed')
    }
  }
}
```

### Excepciones No Manejadas (Unhandled)

**main.ts:**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = app.get(LoggerService)

  // Capturar excepciones no manejadas
  process.on('unhandledRejection', (reason: Error) => {
    logger.logUnhandledException(reason, {
      type: 'unhandledRejection',
      timestamp: new Date().toISOString(),
    })
  })

  process.on('uncaughtException', (error: Error) => {
    logger.logUnhandledException(error, {
      type: 'uncaughtException',
      timestamp: new Date().toISOString(),
    })

    // Dar tiempo al logger para escribir antes de salir
    setTimeout(() => process.exit(1), 1000)
  })

  await app.listen(3001)
}
```

### Output del Exception Logger

```
14:22:10 ✖ ERROR [exception] Unhandled Exception: ValidationError
  ┌─ Request:
  │ Endpoint: POST /api/users
  │ IP: 192.168.1.100
  └─
  ┌─ Error Details:
  │ Name: ValidationError
  │ Message: Email already exists in database
  │ Stack:
  │   ValidationError: Email already exists in database
  │       at UserService.validateEmail (/app/users/user.service.ts:42:11)
  │       at UserService.create (/app/users/user.service.ts:28:5)
  │       at UserController.createUser (/app/users/user.controller.ts:15:7)
  └─
  ┌─ Additional Data:
  │ statusCode: 400
  │ path: /api/users
  │ method: POST
  └─
```

---

## 🎨 Startup Logger

### Banner de Inicio

El banner ya se muestra automáticamente en `main.ts` (ver Inicio Rápido).

### Personalizar el Banner

```typescript
logger.startup.printStartupBanner(
  {
    appName: 'Mi Aplicación',
    version: '2.0.0',
    port: 3000,
    nodeEnv: 'production',
    apiPrefix: '/api/v2',
  },
  {
    type: 'PostgreSQL',
    host: 'db.example.com:5432',
    database: 'myapp_prod',
  }
)
```

### Shutdown Graceful

```typescript
async function gracefulShutdown(signal: string) {
  const logger = app.get(LoggerService)

  logger.startup.printShutdown(`Received ${signal}`)

  await app.close()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

### Error Fatal en Bootstrap

```typescript
async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule)
    // ... configuración
    await app.listen(3001)
  } catch (error) {
    const logger = new LoggerService()
    logger.startup.printError(error as Error, 'Application failed to start')
    process.exit(1)
  }
}
```

---

## 🎯 Casos de Uso Avanzados

### 1. Logging con Correlation ID

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {}

  async processOrder(orderId: string, correlationId: string): Promise<void> {
    // Todos los logs relacionados tendrán el mismo correlation ID
    this.logger.http.info(`[${correlationId}] Processing order ${orderId}`)

    try {
      await this.validateOrder(orderId)
      this.logger.http.info(`[${correlationId}] Order validated`)

      await this.chargePayment(orderId)
      this.logger.http.info(`[${correlationId}] Payment charged`)

      await this.fulfillOrder(orderId)
      this.logger.http.info(`[${correlationId}] Order fulfilled`)
    } catch (error) {
      this.logger.error(`[${correlationId}] Order processing failed`, error.stack)
      throw error
    }
  }
}
```

### 2. Logging de Métricas de Performance

```typescript
@Injectable()
export class AnalyticsService {
  constructor(private readonly logger: LoggerService) {}

  async generateReport(params: ReportParams): Promise<Report> {
    const metrics = {
      startTime: Date.now(),
      memoryBefore: process.memoryUsage().heapUsed,
    }

    const report = await this.computeReport(params)

    metrics.endTime = Date.now()
    metrics.memoryAfter = process.memoryUsage().heapUsed

    const duration = metrics.endTime - metrics.startTime
    const memoryDelta = metrics.memoryAfter - metrics.memoryBefore

    this.logger.verbose('Report generated', {
      duration: `${duration}ms`,
      memoryUsed: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
      recordCount: report.records.length,
    })

    if (duration > 5000) {
      this.logger.warn(`Slow report generation: ${duration}ms`)
    }

    return report
  }
}
```

### 3. Logging Estructurado para Monitoreo

```typescript
@Injectable()
export class MetricsService {
  constructor(private readonly logger: LoggerService) {}

  logBusinessMetric(metric: BusinessMetric): void {
    // Los logs estructurados son ideales para herramientas como ELK, Datadog
    this.logger.http.info('Business metric recorded', {
      metric: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
```

### 4. Logging Condicional por Entorno

```typescript
@Injectable()
export class ConfigService {
  constructor(private readonly logger: LoggerService) {}

  private logSensitive(message: string, data?: any): void {
    // Solo loggear en development
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(message, data)
    }
  }

  async loadConfiguration(): Promise<Config> {
    const config = await this.fetchConfig()

    // Esto solo se verá en development
    this.logSensitive('Configuration loaded', {
      apiKeys: config.apiKeys,  // Sensible
      endpoints: config.endpoints,
    })

    return config
  }
}
```

---

## ⚙️ Configuración Avanzada

### Cambiar Nivel de Log en Runtime

```typescript
@Controller('admin')
export class AdminController {
  constructor(private readonly logger: LoggerService) {}

  @Post('log-level')
  setLogLevel(@Body('level') level: string) {
    // Cambiar el nivel de log temporalmente
    process.env.LOG_LEVEL = level

    // Recrear el logger (solo en dev, cuidado en producción)
    this.logger.warn(`Log level changed to: ${level}`)

    return { level, message: 'Log level updated' }
  }
}
```

### Desactivar Logs de Consola

```bash
# .env
LOG_DISABLE_CONSOLE=true  # Solo escribir a archivos
```

### Formato Personalizado de Timestamp

El formato por defecto es `HH:mm:ss` para consola. Para cambiarlo, edita `base.logger.ts`:

```typescript
winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
```

---

## 🔍 Troubleshooting

### Los logs no aparecen en consola

**Solución 1:** Verifica el nivel de log
```bash
LOG_LEVEL=debug npm run start:dev
```

**Solución 2:** Verifica que el módulo esté importado
```typescript
@Module({
  imports: [LoggerModule],  // ¿Está importado?
})
```

**Solución 3:** Verifica que uses el logger correcto
```typescript
// ❌ Incorrecto
import { Logger } from '@nestjs/common'

// ✅ Correcto
import { LoggerService } from '@core/logger/logger.service'
```

### Los archivos de log no se crean

**Solución:** Verifica permisos de escritura
```bash
mkdir -p logs
chmod 755 logs
```

### Los colores no se ven en producción

**Explicación:** Los colores solo funcionan en TTY (terminal interactivo). En producción con Docker/Kubernetes, usa los archivos de log en formato JSON.

### Queries SQL no se formatean

**Solución:** Verifica que `sql-formatter` esté instalado
```bash
npm install sql-formatter
```

Y que esté habilitado en TypeOrmDatabaseLogger:
```typescript
new TypeOrmDatabaseLogger(1000, true)  // true = formatear SQL
```

---

## 📊 Mejores Prácticas

### ✅ DO

1. **Usar niveles apropiados:**
   - ERROR: Errores que requieren atención inmediata
   - WARN: Situaciones anormales pero manejables
   - INFO: Eventos importantes del negocio
   - HTTP: Requests/Responses (automático)
   - DEBUG: Información para debugging

2. **Incluir contexto:**
   ```typescript
   this.logger.error('Payment failed', {
     orderId,
     amount,
     reason: error.message
   })
   ```

3. **Usar try-catch con logging:**
   ```typescript
   try {
     await operation()
   } catch (error) {
     this.logger.logException(error, { context })
     throw error  // Re-lanzar después de loggear
   }
   ```

4. **Loggear operaciones críticas:**
   - Creación/eliminación de recursos
   - Cambios de estado importantes
   - Operaciones financieras
   - Acceso a datos sensibles

### ❌ DON'T

1. **No loggear en loops intensivos:**
   ```typescript
   // ❌ Malo
   for (const item of millionItems) {
     this.logger.debug(`Processing ${item}`)
   }

   // ✅ Bueno
   this.logger.debug(`Processing ${millionItems.length} items`)
   ```

2. **No loggear datos sensibles manualmente:**
   ```typescript
   // ❌ Malo
   this.logger.log(`User password: ${password}`)

   // ✅ Bueno - El sanitizer lo redacta automáticamente
   this.logger.log('User data', { email, password })
   // Output: { email: 'user@x.com', password: '***REDACTED***' }
   ```

3. **No usar console.log:**
   ```typescript
   // ❌ Malo
   console.log('Something happened')

   // ✅ Bueno
   this.logger.log('Something happened')
   ```

---

## 🎓 Ejemplos Completos

Ver `logger-example.ts` para ejemplos ejecutables de todos los tipos de logs.

```bash
# Ejecutar ejemplos
npx ts-node -r tsconfig-paths/register src/@core/logger/logger-example.ts
```

---

**¿Preguntas?** Consulta el [README.md](./README.md) para arquitectura y detalles técnicos.
