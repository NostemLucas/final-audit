# Sistema de Logging

Sistema de logging modular, tipado y profesional para la aplicación Audit API.

## Estructura

```
logger/
├── formatters/          # Formatters para console y archivos
│   ├── color.formatter.ts
│   ├── console.formatter.ts
│   └── file.formatter.ts
├── loggers/             # Loggers especializados
│   ├── base.logger.ts
│   ├── http.logger.ts
│   ├── exception.logger.ts
│   ├── database.logger.ts
│   └── startup.logger.ts
├── types/               # Tipos e interfaces estrictas
│   ├── log-level.enum.ts
│   └── log-context.interface.ts
├── utils/               # Utilidades
│   ├── user-agent.parser.ts
│   ├── data-sanitizer.ts
│   └── ip-extractor.ts
├── logger.service.ts    # Servicio principal
└── logger.module.ts     # Módulo global
```

## Uso

### Inyección en Servicios

```typescript
import { LoggerService } from '@shared/logger'

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(dto: CreateUserDto) {
    // HTTP logs (automático via interceptor)

    // Database logs
    this.logger.database.logQuery('INSERT INTO users...', 150)

    // Exception logs
    try {
      // ...
    } catch (error) {
      this.logger.exception.logException(error)
    }
  }
}
```

## Loggers Especializados

### 1. HTTP Logger

Logging automático de requests/responses HTTP.

```typescript
// Automático via LoggingInterceptor
logger.http.logRequest(req, userContext)
logger.http.logResponse(req, res, responseTime, userContext)
```

**Features:**

- Parse de User-Agent (OS, browser, device)
- Sanitización de datos sensibles
- Niveles automáticos por status code

### 2. Exception Logger

Logging de excepciones y errores.

```typescript
logger.exception.logException(error, {
  req,
  user: userContext,
  additionalData: { ... }
})

logger.exception.logUnhandledException(error, { type: 'unhandledRejection' })
```

### 3. Database Logger

Logging de operaciones de base de datos.

```typescript
// Queries
logger.database.logQuery(query, duration, userContext)

// Errores
logger.database.logError(error, operation, { user, query })

// Conexión
logger.database.logConnection('connect', databaseName)

// Slow queries
logger.database.logSlowQuery(query, 3000, 1000, userContext)
```

### 4. Startup Logger

Logging visual de inicio de aplicación.

```typescript
// Banner de inicio
logger.startup.printStartupBanner(
  {
    appName: 'Audit API',
    version: '1.0.0',
    port: 3000,
    nodeEnv: 'development',
    apiPrefix: '/api/docs',
  },
  {
    type: 'PostgreSQL',
    host: 'localhost',
    database: 'audit_db',
  },
)

// Shutdown
logger.startup.printShutdown('Received SIGTERM')

// Errores fatales
logger.startup.printError(error, 'Bootstrap failed')
```

## Archivos de Log

Los logs se guardan automáticamente en:

- `logs/http-%DATE%.log` - Requests/responses HTTP
- `logs/http-error-%DATE%.log` - Errores HTTP
- `logs/exception-%DATE%.log` - Excepciones
- `logs/exception-error-%DATE%.log` - Errores de excepciones
- `logs/database-%DATE%.log` - Operaciones de BD
- `logs/database-error-%DATE%.log` - Errores de BD

**Configuración:**

- Rotación diaria automática
- Máximo 20MB por archivo
- Retención de 30 días

## Niveles de Log

```typescript
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}
```

Configurar con variable de entorno:

```bash
LOG_LEVEL=debug npm run start
```

## Tipos Estrictos

Todo el sistema está completamente tipado, sin uso de `any`.

```typescript
interface HttpLogContext {
  user?: UserContext
  device?: DeviceInfo
  request?: HttpRequestContext
  response?: HttpResponseContext
}

interface ExceptionLogContext {
  user?: UserContext
  request?: HttpRequestContext
  error: ErrorContext
  additionalData?: Record<string, unknown>
}

interface DatabaseLogContext {
  user?: UserContext
  database: DatabaseErrorContext
  query?: string
  additionalData?: Record<string, unknown>
}
```

## Sanitización de Datos

Los siguientes campos se redactan automáticamente:

- password
- token
- refreshToken
- accessToken
- secret
- apiKey
- authorization
- cookie
- sessionId

```typescript
DataSanitizer.sanitize(req.body)
// { password: '***REDACTED***', email: 'user@example.com' }
```

## Parse de User-Agent

```typescript
UserAgentParser.parse(userAgent)
// {
//   os: 'Windows',
//   browser: 'Chrome',
//   device: 'Desktop',
//   userAgent: '...'
// }
```

## Colores en Console

El logger usa colores automáticos según el nivel:

- ERROR → Rojo
- WARN → Amarillo
- INFO → Verde
- HTTP → Magenta
- DEBUG → Azul
- VERBOSE → Cyan

## Variables de Entorno

```bash
# Nivel de logging (default: info)
LOG_LEVEL=debug

# Puerto de la aplicación
PORT=3000

# Entorno
NODE_ENV=development

# URL de la base de datos (para logging)
DATABASE_URL=postgresql://user:pass@localhost:5432/audit_db
```

## Integración

El logger se integra automáticamente con:

- **LoggingInterceptor** - HTTP requests/responses
- **AllExceptionsFilter** - Excepciones globales
- **PrismaExceptionFilter** - Errores de BD
- **main.ts** - Startup y shutdown

No requiere configuración adicional.
