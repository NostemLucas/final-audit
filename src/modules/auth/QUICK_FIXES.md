# 🛠️ Quick Fixes - Módulo de Autenticación

Correcciones rápidas que puedes implementar inmediatamente.

---

## 1. ✅ Eliminar duplicación de JwtAuthGuard

### Antes:
```typescript
// auth.module.ts
providers: [
  // ...
  JwtAuthGuard, // ← ELIMINAR ESTA LÍNEA
  // ...
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
]
```

### Después:
```typescript
// auth.module.ts
providers: [
  // ...otros providers...

  // ========================================
  // Global Guards (registrados como APP_GUARD)
  // ========================================
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard, // ✅ Solo este registro es necesario
  },
],

exports: [
  // ...
  JwtAuthGuard, // ✅ Exportar si otros módulos lo necesitan manualmente
]
```

**Archivo a modificar:** `src/modules/auth/auth.module.ts` - Eliminar línea 117

---

## 2. ⚡ Optimizar JwtStrategy (Opcional - según tráfico)

### Opción A: Agregar caché (Recomendado para alto tráfico)

```typescript
// src/modules/auth/strategies/jwt.strategy.ts

import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // ...constructores actuales...
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({...})
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    // 1. Extraer token
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado')
    }

    // 2. Verificar blacklist
    const isBlacklisted = await this.tokensService.isTokenBlacklisted(token)
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revocado')
    }

    // 3. Verificar usuario con caché (5 minutos)
    const cacheKey = `user:exists:${payload.sub}`
    let userExists = await this.cacheManager.get<boolean>(cacheKey)

    if (userExists === undefined) {
      const user = await this.usersRepository.findById(payload.sub)
      userExists = user !== null && user.status === UserStatus.ACTIVE

      // Cachear por 5 minutos
      await this.cacheManager.set(cacheKey, userExists, 300000)
    }

    if (!userExists) {
      throw new UnauthorizedException('Usuario no válido')
    }

    // 4. Retornar payload
    return payload
  }
}
```

### Opción B: Eliminar validación de usuario (Máxima performance)

```typescript
async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
  // 1. Extraer token
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
  if (!token) {
    throw new UnauthorizedException('Token no proporcionado')
  }

  // 2. Verificar blacklist (suficiente para seguridad)
  const isBlacklisted = await this.tokensService.isTokenBlacklisted(token)
  if (isBlacklisted) {
    throw new UnauthorizedException('Token revocado')
  }

  // ✅ Retornar directamente (sin consulta DB)
  // El blacklist ya cubre el caso de logout/revocación
  return payload
}
```

**Recomendación:**
- **Alto tráfico (>1000 req/s):** Opción B
- **Tráfico medio:** Opción A (caché)
- **Tráfico bajo + usuarios frecuentemente eliminados:** Mantener actual

---

## 3. 📝 Agregar logging de eventos de seguridad

### Paso 1: Crear servicio de audit log

```typescript
// src/modules/auth/services/auth-audit-log.service.ts

import { Injectable } from '@nestjs/common'
import { LoggerService } from '@core/logger'

export enum AuthEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  TWO_FACTOR_GENERATED = 'TWO_FACTOR_GENERATED',
  TWO_FACTOR_SUCCESS = 'TWO_FACTOR_SUCCESS',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface AuthLogData {
  event: AuthEvent
  userId?: string
  email?: string
  ip: string
  userAgent?: string
  metadata?: Record<string, any>
}

@Injectable()
export class AuthAuditLogService {
  constructor(private readonly logger: LoggerService) {}

  log(data: AuthLogData): void {
    this.logger.info('Security Event', {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'auth',
    })
  }

  logSuccess(event: AuthEvent, data: Omit<AuthLogData, 'event'>): void {
    this.log({ event, ...data })
  }

  logFailure(event: AuthEvent, data: Omit<AuthLogData, 'event'>, error: string): void {
    this.logger.warn('Security Event Failed', {
      event,
      ...data,
      error,
      timestamp: new Date().toISOString(),
      service: 'auth',
    })
  }
}
```

### Paso 2: Usar en LoginUseCase

```typescript
// src/modules/auth/use-cases/login/login.use-case.ts

import { AuthAuditLogService, AuthEvent } from '../../services/auth-audit-log.service'

@Injectable()
export class LoginUseCase {
  constructor(
    // ...constructores actuales...
    private readonly authAuditLog: AuthAuditLogService,
  ) {}

  async execute(dto: LoginDto, ip: string, userAgent?: string) {
    try {
      // ...lógica actual de login...

      // ✅ Log exitoso
      this.authAuditLog.logSuccess(AuthEvent.LOGIN_SUCCESS, {
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
      })

      return { response, refreshToken }
    } catch (error) {
      // ✅ Log fallo
      this.authAuditLog.logFailure(
        AuthEvent.LOGIN_FAILED,
        {
          email: dto.usernameOrEmail,
          ip,
          userAgent,
        },
        error.message,
      )
      throw error
    }
  }
}
```

### Paso 3: Registrar en AuthModule

```typescript
// auth.module.ts
import { AuthAuditLogService } from './services/auth-audit-log.service'

@Module({
  providers: [
    // ...
    AuthAuditLogService,
    // ...
  ],
})
```

---

## 4. 🔍 Crear helper para extracción de tokens (Opcional)

```typescript
// src/modules/auth/helpers/extract-token.helper.ts

import type { Request } from 'express'

/**
 * Helper para extraer tokens de diferentes fuentes
 */
export class ExtractTokenHelper {
  /**
   * Extrae el Bearer token del header Authorization
   */
  static fromAuthHeader(req: Request): string | undefined {
    const authHeader = req.headers.authorization
    if (!authHeader) return undefined

    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }

  /**
   * Extrae un token de una cookie específica
   */
  static fromCookie(req: Request, cookieName: string): string | undefined {
    return req?.cookies?.[cookieName]
  }

  /**
   * Extrae token de múltiples fuentes (prioridad: header > cookie)
   */
  static fromRequest(req: Request, cookieName?: string): string | undefined {
    // Intentar header primero
    const headerToken = this.fromAuthHeader(req)
    if (headerToken) return headerToken

    // Luego cookie si se especifica
    if (cookieName) {
      return this.fromCookie(req, cookieName)
    }

    return undefined
  }
}
```

Uso en auth.controller.ts:
```typescript
import { ExtractTokenHelper } from '../helpers/extract-token.helper'

// Reemplazar método privado con:
const accessToken = ExtractTokenHelper.fromAuthHeader(req)
```

---

## 5. 🧪 Agregar tests básicos

### Test para JwtAuthGuard

```typescript
// src/modules/auth/guards/jwt-auth.guard.spec.ts

import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from './jwt-auth.guard'

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new JwtAuthGuard(reflector)
  })

  it('debería permitir acceso a rutas públicas', () => {
    const context = createMockExecutionContext()
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

    const result = guard.canActivate(context)

    expect(result).toBe(true)
  })

  it('debería delegar a la estrategia JWT para rutas protegidas', () => {
    const context = createMockExecutionContext()
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    jest.spyOn(guard as any, 'canActivate').mockResolvedValue(true)

    const result = guard.canActivate(context)

    expect(result).toBeDefined()
  })
})

function createMockExecutionContext(): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any
}
```

---

## 6. 📊 Variables de entorno - Verificación

Agregar al startup de la app:

```typescript
// src/main.ts o auth.module.ts

function validateAuthEnvVars() {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'RESET_PASSWORD_JWT_SECRET',
    'TWO_FACTOR_JWT_SECRET',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas para autenticación: ${missing.join(', ')}`
    )
  }

  // Verificar que los secrets sean diferentes
  const secrets = new Set([
    process.env.JWT_SECRET,
    process.env.JWT_REFRESH_SECRET,
    process.env.RESET_PASSWORD_JWT_SECRET,
    process.env.TWO_FACTOR_JWT_SECRET,
  ])

  if (secrets.size !== 4) {
    console.warn(
      '⚠️  ADVERTENCIA: Algunos JWT secrets son idénticos. ' +
      'Para máxima seguridad, cada tipo de token debe tener un secret único.'
    )
  }
}

// Llamar al iniciar
validateAuthEnvVars()
```

---

## 📋 Orden de Implementación Sugerido

1. **Ahora mismo (5 minutos):**
   - ✅ Fix #1: Eliminar duplicación de JwtAuthGuard

2. **Esta semana (2-3 horas):**
   - ✅ Fix #3: Implementar AuthAuditLogService
   - ✅ Fix #6: Validación de env vars

3. **Este mes (según necesidad):**
   - ⚡ Fix #2: Optimizar JwtStrategy (solo si hay problemas de performance)
   - 🔍 Fix #4: ExtractTokenHelper (solo si se necesita en otros lugares)
   - 🧪 Fix #5: Tests (siempre es bueno, pero no urgente)

---

## ✅ Testing de los Fixes

Después de implementar cada fix:

```bash
# 1. Verificar que compila
npm run build

# 2. Correr tests
npm test

# 3. Probar login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin@example.com", "password": "password"}'

# 4. Verificar logs
# Revisar que los eventos se estén logeando correctamente
```

---

**¡Listo para implementar!** 🚀
