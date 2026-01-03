# 📝 Sistema de Logging Profesional

Sistema de logging modular, tipado y altamente visual para NestJS, basado en **Winston** con formateo personalizado y rotación automática de archivos.

## ✨ Características Principales

- 🎨 **Logs Visuales Mejorados** - Formateo con colores, símbolos y estructura tipo "box" para mejor legibilidad
- 📊 **Winston Integrado** - Sistema de logging enterprise-grade con niveles jerárquicos
- 🔄 **Rotación Automática** - Archivos de log rotan diariamente (winston-daily-rotate-file)
- 🎯 **Loggers Especializados** - HTTP, Database (TypeORM), Exceptions, Startup
- 🛡️ **Sanitización Automática** - Oculta datos sensibles (passwords, tokens, etc.)
- 💾 **SQL Formatting** - Queries SQL formateadas con syntax highlighting
- 🌈 **Colores Inteligentes** - Status codes, response times y errores con colores contextuales
- 📦 **Tipado Completo** - TypeScript strict sin `any`
- 🌐 **User-Agent Parsing** - Detección de browser, OS y dispositivo
- 🔍 **IP Extraction** - Maneja proxies y load balancers correctamente

---

## 📂 Arquitectura del Sistema

```
src/@core/logger/
├── formatters/                 # Formatters personalizados
│   ├── color.formatter.ts     # Configuración de colores por nivel
│   ├── console.formatter.ts   # Formatter visual mejorado ✨
│   └── file.formatter.ts      # Formatter para archivos JSON
│
├── loggers/                   # Loggers especializados
│   ├── base.logger.ts        # Logger base con Winston
│   ├── http.logger.ts        # Requests/Responses HTTP
│   ├── exception.logger.ts   # Errores y excepciones
│   ├── typeorm-database.logger.ts  # TypeORM queries y errores
│   ├── startup.logger.ts     # Banner de inicio ASCII
│   └── index.ts              # Exports
│
├── types/                     # Tipos TypeScript
│   ├── log-level.enum.ts     # Niveles de log
│   ├── log-context.interface.ts  # Contextos tipados
│   └── index.ts              # Exports
│
├── utils/                     # Utilidades
│   ├── user-agent.parser.ts  # Parser de User-Agent
│   ├── data-sanitizer.ts     # Sanitización de datos
│   ├── ip-extractor.ts       # Extracción de IP real
│   └── index.ts              # Exports
│
├── logger.service.ts          # Servicio principal (inyectable)
├── logger.module.ts           # Módulo global de NestJS
├── logger-example.ts          # Ejemplos de uso
├── README.md                  # Este archivo
└── USAGE.md                   # Guía detallada de uso
```

---

## 🎯 Winston: El Motor del Logger

### ¿Qué es Winston?

**Winston** es la librería de logging más popular para Node.js, diseñada para ser simple, universal y extremadamente flexible. Este logger está construido sobre Winston para aprovechar sus capacidades enterprise.

### Niveles de Log Jerárquicos

Winston usa un sistema de niveles numéricos donde cada nivel tiene una prioridad. Solo se muestran los logs del nivel configurado y superiores:

```typescript
enum LogLevel {
  ERROR   = 'error',    // 0 - Errores críticos
  WARN    = 'warn',     // 1 - Advertencias
  INFO    = 'info',     // 2 - Información general
  HTTP    = 'http',     // 3 - Requests HTTP (default) ⭐
  VERBOSE = 'verbose',  // 4 - Información detallada
  DEBUG   = 'debug',    // 5 - Debugging
  SILLY   = 'silly',    // 6 - Todo (muy verboso)
}
```

#### Jerarquía de Niveles

Si configuras `LOG_LEVEL=http` (default), verás:
- ✅ ERROR (0)
- ✅ WARN (1)
- ✅ INFO (2)
- ✅ HTTP (3)
- ❌ VERBOSE (4) - No se muestra
- ❌ DEBUG (5) - No se muestra
- ❌ SILLY (6) - No se muestra

Si configuras `LOG_LEVEL=debug`, verás todos excepto SILLY.

### Transports en Winston

Los **transports** son destinos de salida para los logs. Este logger usa:

1. **Console Transport** - Salida a consola con colores
2. **DailyRotateFile Transport** - Archivos con rotación diaria
   - `logs/{logger-name}-%DATE%.log` - Todos los logs
   - `logs/{logger-name}-error-%DATE%.log` - Solo errores

### Formatters Personalizados

Los **formatters** transforman los logs antes de mostrarlos:

```typescript
winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  colorFormatter,      // Coloriza según nivel
  consoleFormatter,    // Formatea con estructura visual
)
```

---

## 🎨 Formateo Visual Mejorado

### Console Formatter

El formatter de consola ha sido completamente rediseñado para máxima legibilidad:

#### Logs HTTP
```
22:53:15 → HTTP [http] Incoming Request: GET /api/users
  ┌─ Request:
  │ Endpoint: GET /api/users
  │ IP: 192.168.1.1
  │ Content-Type: application/json
  └─
  ┌─ Device:
  │ Browser: Chrome
  │ OS: Windows
  │ Device: Desktop
  └─
```

#### Logs de Base de Datos con SQL
```
10:30:45 ⚙ DEBUG [database] Database Query Executed [QUERY]
────────────────────────────────────────────────────────────────────────────────
  │ SELECT
  │   u.id,
  │   u.email,
  │   COUNT(o.id) AS order_count
  │ FROM
  │   users u
  │   LEFT JOIN orders o ON o.user_id = u.id
  │ WHERE
  │   u.active = $1
  │ GROUP BY
  │   u.id
  │ -- Parameters: [true]
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 45ms
  └─
```

#### Logs de Error
```
14:22:10 ✖ ERROR [exception] Unhandled Exception
  ┌─ Error Details:
  │ Name: ValidationError
  │ Message: Email already exists
  │ Stack:
  │   ValidationError: Email already exists
  │       at UserService.create (/app/users/user.service.ts:42:11)
  │       at async UserController.createUser (/app/users/user.controller.ts:28:5)
  └─
```

### Símbolos por Nivel

- `✖` ERROR (rojo)
- `⚠` WARN (amarillo)
- `ℹ` INFO (verde)
- `→` HTTP (magenta)
- `⚙` DEBUG (azul)
- `…` VERBOSE (cyan)
- `○` SILLY (gris)

### Colores Contextuales

#### Status Codes HTTP
- `200-299` → Verde
- `400-499` → Amarillo
- `500-599` → Rojo

#### Response Times
- `< 1000ms` → Verde
- `≥ 1000ms` → Rojo

#### SQL Syntax Highlighting
- **Palabras clave** (SELECT, FROM, WHERE) → Blanco bold
- **Strings** ('text') → Verde
- **Números** (123) → Cyan
- **Comentarios** (-- comment) → Gris itálico

---

## 🔧 Loggers Especializados

### 1. HTTP Logger (`http.logger.ts`)

Maneja requests y responses HTTP automáticamente.

**Características:**
- Logging de request entrante con método, URL, IP, headers
- Logging de response con status code, tiempo de respuesta
- Parse automático de User-Agent
- Sanitización de body (oculta passwords, tokens)
- Nivel automático según status code (ERROR si 5xx, WARN si 4xx)

**Integración:**
- `LoggingInterceptor` - Intercepta todas las requests automáticamente

### 2. TypeORM Database Logger (`typeorm-database.logger.ts`)

Implementa la interfaz `Logger` de TypeORM.

**Características:**
- Formateo SQL con `sql-formatter` (PostgreSQL syntax)
- Detección de queries lentas (configurable threshold)
- Logging de migraciones y schema builds
- Logging de conexión/desconexión
- Parámetros mostrados claramente

**Configuración TypeORM:**
```typescript
TypeOrmModule.forRoot({
  logger: new TypeOrmDatabaseLogger(1000), // threshold 1000ms
  logging: ['query', 'error', 'warn'],
})
```

### 3. Exception Logger (`exception.logger.ts`)

Captura excepciones y errores.

**Características:**
- Stack traces formateados
- Contexto de request cuando disponible
- Información de usuario
- Datos adicionales personalizables

**Integración:**
- `AllExceptionsFilter` - Captura excepciones globales
- Manual en bloques try-catch

### 4. Startup Logger (`startup.logger.ts`)

Banner visual de inicio de aplicación.

**Características:**
- Logo ASCII personalizado (`AUDIT CORE`)
- Información de aplicación (versión, puerto, entorno)
- Información de base de datos
- Timestamp de inicio
- URLs clickables

---

## 🛡️ Seguridad y Sanitización

### Datos Sensibles Redactados

El `DataSanitizer` oculta automáticamente estos campos:

```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiKey', 'authorization', 'cookie',
  'sessionId', 'creditCard', 'ssn', 'pin'
]
```

**Ejemplo:**
```typescript
Input:  { email: 'user@example.com', password: 'secret123' }
Output: { email: 'user@example.com', password: '***REDACTED***' }
```

### Extracción Segura de IP

El `IpExtractor` maneja correctamente:
- `x-forwarded-for` (proxies, load balancers)
- `x-real-ip` (nginx)
- `req.ip` (fallback)

---

## 📦 Archivos de Log

### Ubicación y Nombres

```
logs/
├── http-%DATE%.log              # Todos los logs HTTP
├── http-error-%DATE%.log        # Solo errores HTTP (5xx)
├── exception-%DATE%.log         # Todas las excepciones
├── exception-error-%DATE%.log   # Solo errores críticos
├── database-%DATE%.log          # Queries y operaciones DB
├── database-error-%DATE%.log    # Errores de base de datos
├── example-%DATE%.log           # Logger de ejemplo
└── example-error-%DATE%.log     # Errores del logger ejemplo
```

### Configuración de Rotación

```typescript
{
  filename: 'logs/{logger-name}-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',      // Máximo 20MB por archivo
  maxFiles: '30d',     // Retener 30 días
  format: fileFormatter  // JSON estructurado
}
```

### Formato JSON de Archivos

Los logs en archivos se guardan en formato JSON para fácil parsing:

```json
{
  "timestamp": "2026-01-02T22:53:15.123Z",
  "level": "http",
  "service": "http",
  "message": "Incoming Request: GET /api/users",
  "request": {
    "method": "GET",
    "url": "/api/users",
    "ip": "192.168.1.1"
  },
  "device": {
    "browser": "Chrome",
    "os": "Windows"
  }
}
```

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Nivel de logging (default: http)
LOG_LEVEL=debug

# Puerto de la aplicación
PORT=3001

# Entorno de ejecución
NODE_ENV=development

# URL de base de datos (para logs de startup)
DATABASE_URL=postgresql://user:pass@localhost:5432/db_name
```

### Niveles Recomendados por Entorno

```bash
# Development - Ver todo
LOG_LEVEL=debug

# Staging - Ver operaciones importantes
LOG_LEVEL=http

# Production - Solo información crítica
LOG_LEVEL=info
```

---

## 🔌 Integración con NestJS

### Módulo Global

```typescript
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

El módulo es **Global**, por lo que solo necesitas importarlo una vez en `AppModule`.

### Logger de NestJS

```typescript
// main.ts
const app = await NestFactory.create(AppModule)
const logger = app.get(LoggerService)
app.useLogger(logger)  // Reemplaza el logger por defecto de NestJS
```

---

## 📚 Dependencias

```json
{
  "winston": "^3.19.0",              // Motor de logging
  "winston-daily-rotate-file": "^5.0.0",  // Rotación de archivos
  "chalk": "^5.6.2",                 // Colores en terminal
  "sql-formatter": "^15.6.12"        // Formateo de SQL
}
```

---

## 🚀 Ventajas de Este Sistema

1. **Visual** - Logs fáciles de leer con colores y estructura
2. **Completo** - Cubre HTTP, DB, Excepciones, Startup
3. **Automático** - Interceptors y filtros integrados
4. **Seguro** - Sanitización de datos sensibles
5. **Performante** - Rotación de archivos, niveles configurables
6. **Tipado** - TypeScript strict, sin `any`
7. **Flexible** - Fácil de extender con nuevos loggers

---

## 📖 Documentación Adicional

- **[USAGE.md](./USAGE.md)** - Guía detallada con ejemplos de uso
- **[logger-example.ts](./logger-example.ts)** - Ejemplos ejecutables

---

## 🤝 Contribuir

Para agregar un nuevo logger especializado:

1. Extender `BaseLogger`
2. Definir contextos tipados en `types/`
3. Implementar métodos específicos
4. Agregar al `LoggerService`
5. Actualizar documentación

---

**Versión:** 2.0.0
**Última actualización:** Enero 2026
