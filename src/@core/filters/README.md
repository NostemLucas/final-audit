# Exception Filters

Sistema de manejo global de excepciones integrado con el Logger Module.

## ¿Qué hace?

El `HttpExceptionFilter` captura **todas** las excepciones que ocurren en tu aplicación y:

1. ✅ Las loguea usando el `LoggerService`
2. ✅ Formatea la respuesta de error de manera consistente
3. ✅ Oculta detalles sensibles en producción
4. ✅ Incluye información útil para debugging en desarrollo

## Arquitectura

```
Request → Controller → Service
                ↓
            Exception
                ↓
    HttpExceptionFilter (captura)
                ↓
         ┌──────┴──────┐
         ↓              ↓
    LoggerService   Response
    (loguea)        (formatea)
```

## Flujo de Ejecución

### 1. Request Exitoso

```
Request → LoggingInterceptor (log request)
       → Controller
       → LoggingInterceptor (log response)
       → Response al cliente
```

### 2. Request con Error

```
Request → LoggingInterceptor (log request)
       → Controller
       → Exception thrown
       → HttpExceptionFilter (captura)
       → LoggerService (loguea exception)
       → Response formateada al cliente
```

## Tipos de Excepciones Soportadas

### HttpException (NestJS)

```typescript
throw new BadRequestException('Datos inválidos')
throw new NotFoundException('Usuario no encontrado')
throw new UnauthorizedException('No autorizado')
```

**Respuesta:**
```json
{
  "statusCode": 404,
  "timestamp": "2026-01-03T21:30:00.000Z",
  "path": "/api/users/123",
  "method": "GET",
  "message": "Usuario no encontrado",
  "error": "Not Found"
}
```

### Error Estándar de JavaScript

```typescript
throw new Error('Algo salió mal')
```

**Respuesta:**
```json
{
  "statusCode": 500,
  "timestamp": "2026-01-03T21:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Algo salió mal",
  "error": "Error"
}
```

### HttpException Personalizada

```typescript
throw new HttpException(
  {
    message: 'Error de validación',
    details: ['Email inválido', 'Password muy corto'],
    code: 'VALIDATION_ERROR',
  },
  HttpStatus.UNPROCESSABLE_ENTITY
)
```

**Respuesta (Desarrollo):**
```json
{
  "statusCode": 422,
  "timestamp": "2026-01-03T21:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Error de validación",
  "error": "Unprocessable Entity",
  "details": {
    "message": "Error de validación",
    "details": ["Email inválido", "Password muy corto"],
    "code": "VALIDATION_ERROR"
  }
}
```

**Respuesta (Producción):**
```json
{
  "statusCode": 422,
  "timestamp": "2026-01-03T21:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Error de validación",
  "error": "Unprocessable Entity"
}
```

## Configuración

El filter ya está registrado globalmente en `AppModule`:

```typescript
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

No necesitas hacer nada más. **Funciona automáticamente en toda la aplicación.**

## Testing

### Probar Manualmente

```bash
# Iniciar servidor
npm run start:dev

# Request exitoso
curl http://localhost:3000/test/success

# Error 400
curl http://localhost:3000/test/error/400

# Error 404
curl http://localhost:3000/test/error/404

# Error 500
curl http://localhost:3000/test/error/500

# Error personalizado
curl http://localhost:3000/test/error/custom
```

### Verificar Logs

En los logs verás algo como:

```bash
# Request
21:30:15 → HTTP [http] POST /api/users

# Exception
21:30:15 ✖ ERROR [exception] Exception: BadRequestException - Datos inválidos
  ┌─ Request:
  │ Endpoint: POST /api/users
  │ IP: 127.0.0.1
  └─
  ┌─ Error Details:
  │ Name: BadRequestException
  │ Message: Datos inválidos
  │ Stack:
  │   BadRequestException: Datos inválidos
  │       at UserController.create (/app/user.controller.ts:25:15)
  └─
```

## Diferencia entre Filter e Interceptor

### HttpExceptionFilter
- ✅ Captura **excepciones**
- ✅ Formatea **respuestas de error**
- ✅ Se ejecuta cuando hay un **error**

### LoggingInterceptor
- ✅ Intercepta **todos** los requests/responses
- ✅ Loguea entrada y salida
- ✅ Calcula tiempo de respuesta
- ✅ Se ejecuta **siempre**

**Ambos trabajan juntos:**
1. `LoggingInterceptor` loguea el request
2. Si hay error → `HttpExceptionFilter` lo captura y loguea
3. `HttpExceptionFilter` formatea la respuesta de error
4. Cliente recibe respuesta formateada

## Personalización

### Agregar Información Adicional al Log

```typescript
throw new HttpException(
  {
    message: 'Error procesando pago',
    transactionId: '123456',
    amount: 100.50,
  },
  HttpStatus.PAYMENT_REQUIRED
)
```

El filter logueará automáticamente todos los detalles.

### Crear Exception Personalizada

```typescript
export class PaymentFailedException extends HttpException {
  constructor(transactionId: string) {
    super(
      {
        message: 'Pago fallido',
        transactionId,
        code: 'PAYMENT_FAILED',
      },
      HttpStatus.PAYMENT_REQUIRED
    )
  }
}

// Uso
throw new PaymentFailedException('txn_123456')
```

## Integración con Otros Módulos

El filter funciona automáticamente con:
- ✅ Validación de DTOs (`class-validator`)
- ✅ Guards de autenticación
- ✅ Pipes personalizados
- ✅ Middlewares
- ✅ Cualquier código que lance excepciones

## Producción vs Desarrollo

### Desarrollo (`NODE_ENV=development`)
- Muestra stack traces
- Incluye detalles de la excepción
- Logs más verbosos

### Producción (`NODE_ENV=production`)
- Oculta stack traces
- No incluye detalles sensibles
- Logs optimizados

## Best Practices

### ✅ Hacer

```typescript
// Usar excepciones HTTP específicas
throw new NotFoundException('Usuario no encontrado')

// Agregar contexto útil
throw new BadRequestException({
  message: 'Email inválido',
  field: 'email',
  value: email,
})
```

### ❌ Evitar

```typescript
// No usar strings genéricos
throw 'Error'

// No perder información del error original
try {
  await something()
} catch (err) {
  throw new Error('Algo falló')  // ❌ Perdiste el error original
}

// Mejor:
try {
  await something()
} catch (err) {
  throw new InternalServerErrorException({
    message: 'Error procesando request',
    originalError: err.message,
  })
}
```

## Troubleshooting

### Los errores no se están logueando

Verifica que:
1. `HttpExceptionFilter` esté registrado en `AppModule`
2. `LoggerModule` esté importado
3. No tengas otro exception filter que lo override

### Detalles de error no aparecen en producción

Es normal. Por seguridad, los detalles solo se muestran en desarrollo.

### Quiero logging adicional

Agrega información en la excepción:

```typescript
throw new HttpException(
  {
    message: 'Error',
    customField: 'valor',
    moreData: { ... },
  },
  HttpStatus.BAD_REQUEST
)
```

Todo lo que pongas en el objeto será logueado.
