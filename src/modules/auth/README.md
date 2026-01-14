# 🔐 Auth Module - Sistema de Autenticación

Sistema de autenticación completo con JWT, refresh tokens, 2FA, password reset y rate limiting.

## 📑 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Flujos de Autenticación](#flujos-de-autenticación)
- [Seguridad](#seguridad)
- [API Endpoints](#api-endpoints)
- [Uso en Frontend](#uso-en-frontend)
- [Troubleshooting](#troubleshooting)

---

## ✨ Características

### ✅ Implementado y Funcional

- **Autenticación JWT**
  - Access tokens de corta duración (15 minutos por defecto)
  - Refresh tokens de larga duración (7 días por defecto) en HTTP-only cookies
  - Token rotation automático en refresh
  - Blacklist de tokens revocados

- **Rate Limiting Multi-Nivel**
  - Por IP: 10 intentos en 15 minutos
  - Por usuario: 5 intentos en 15 minutos
  - Prevención de ataques de fuerza bruta
  - Configurable por operación (login, reset password, 2FA)

- **Two-Factor Authentication (2FA)**
  - Códigos numéricos de 6 dígitos
  - Envío por email
  - Expiración configurable (5 minutos por defecto)
  - One-time use (no reutilizable)
  - Sistema híbrido JWT + Redis

- **Password Reset**
  - Tokens seguros con sistema híbrido (JWT + Redis)
  - Expiración de 1 hora
  - Prevención de timing attacks
  - Revocación automática de todas las sesiones al cambiar password
  - Rate limiting para prevenir spam

- **Seguridad Avanzada**
  - HTTP-only cookies (prevención XSS)
  - SameSite=strict (prevención CSRF)
  - Password hashing con bcrypt (10 rounds)
  - Sistema híbrido de tokens (JWT + Redis) para revocación inmediata

### 🔒 Guard Global

Todas las rutas están protegidas por defecto. Para marcar una ruta como pública:

```typescript
import { Public } from '@modules/auth'

@Public()
@Post('register')
async register() {
  // Ruta pública
}
```

---

## 🏗️ Arquitectura

### Estructura del Módulo

```
src/modules/auth/
├── config/
│   └── rate-limit.config.ts         # Configuración de rate limiting
├── constants/                        # Constantes (TTL, longitud códigos)
├── controllers/
│   ├── auth.controller.ts           # Login, logout, refresh
│   ├── password-reset.controller.ts # Reset de contraseña
│   └── two-factor.controller.ts     # 2FA
├── decorators/
│   ├── public.decorator.ts          # @Public() para rutas públicas
│   └── get-user.decorator.ts        # @GetUser() para obtener usuario del JWT
├── dtos/                            # Data Transfer Objects
├── exceptions/                      # Excepciones personalizadas
├── guards/
│   └── jwt-auth.guard.ts           # Guard global JWT
├── helpers/
│   └── jwt-token.helper.ts         # Utilidades JWT
├── interfaces/                      # Tipos TypeScript
├── policies/
│   ├── login-rate-limit.policy.ts           # Rate limiting para login
│   └── email-operation-rate-limit.policy.ts # Rate limiting para emails
├── services/
│   ├── tokens.service.ts                    # Gestión de tokens JWT
│   ├── reset-password-token.service.ts      # Tokens de reset
│   └── two-factor-token.service.ts          # Tokens 2FA
├── strategies/
│   ├── jwt.strategy.ts             # Estrategia para access tokens
│   └── jwt-refresh.strategy.ts     # Estrategia para refresh tokens
└── use-cases/                      # Lógica de negocio
    ├── login/
    ├── logout/
    ├── refresh-token/
    ├── password-reset/
    └── two-factor/
```

### Diagrama de Capas

```
┌─────────────────────────────────────────────┐
│  CONTROLLERS (HTTP Layer)                   │
│  - auth.controller.ts                       │
│  - password-reset.controller.ts             │
│  - two-factor.controller.ts                 │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  USE CASES (Business Logic)                 │
│  - LoginUseCase                             │
│  - RefreshTokenUseCase                      │
│  - Generate2FACodeUseCase                   │
│  - RequestResetPasswordUseCase              │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  SERVICES & POLICIES                        │
│  - TokensService                            │
│  - LoginRateLimitPolicy                     │
│  - ResetPasswordTokenService                │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  INFRASTRUCTURE (@core)                     │
│  - Redis (cache/token storage)              │
│  - PostgreSQL (users repository)            │
│  - Email Service                            │
└─────────────────────────────────────────────┘
```

### Sistema de Tokens Híbrido (JWT + Redis)

**¿Por qué híbrido?**

Los JWT puros son stateless pero no revocables. Redis permite revocación pero requiere consulta en cada request. La combinación ofrece lo mejor de ambos:

```
┌─────────────────────────────────────────────────────────────┐
│  JWT (JSON Web Token)                                       │
│  ✅ Stateless validation (verifica firma sin DB)            │
│  ✅ Contains user data (email, roles, etc)                  │
│  ✅ Cryptographically signed (tamper-proof)                 │
│  ❌ No revocable (válido hasta expiración)                  │
└─────────────────────────────────────────────────────────────┘
                           +
┌─────────────────────────────────────────────────────────────┐
│  Redis (Token Storage)                                      │
│  ✅ Immediately revocable (delete from Redis)               │
│  ✅ One-time use tokens (delete after validation)           │
│  ✅ Automatic expiration (TTL)                              │
│  ✅ Traceable (list all user tokens)                        │
│  ❌ Requires Redis query (small overhead)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  HYBRID = Seguridad máxima con performance aceptable        │
│                                                             │
│  1. Generar JWT con userId + tokenId                        │
│  2. Almacenar tokenId en Redis con TTL                      │
│  3. Validar: JWT signature + Redis exists                   │
│  4. Revocar: Eliminar de Redis (JWT se vuelve inválido)     │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de validación:**

```typescript
// 1. Usuario hace request con token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. JwtStrategy valida
async validate(req: Request, payload: JwtPayload) {
  // A. Verificar firma JWT (rápido, sin DB)
  // B. Verificar que no está en blacklist (Redis query)
  const isBlacklisted = await this.tokensService.isTokenBlacklisted(token)
  if (isBlacklisted) throw new UnauthorizedException('Token revocado')

  // C. Verificar usuario existe (opcional, para seguridad extra)
  const user = await this.usersRepository.findById(payload.sub)
  if (!user) throw new UnauthorizedException('Usuario no encontrado')

  return payload // Adjuntar a req.user
}
```

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

Crea un archivo `.env` con las siguientes variables:

```bash
# ========================================
# JWT Configuration
# ========================================

# Access Token (token de corta duración en Authorization header)
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m  # 15 minutos (formato: https://github.com/vercel/ms)

# Refresh Token (token de larga duración en HTTP-only cookie)
JWT_REFRESH_SECRET=your-refresh-secret-key-different-from-access
JWT_REFRESH_EXPIRES_IN=7d  # 7 días

# ========================================
# Password Reset Tokens
# ========================================
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h      # 1 hora
RESET_PASSWORD_JWT_SECRET=your-reset-password-secret-key

# ========================================
# Two-Factor Authentication (2FA)
# ========================================
TWO_FACTOR_CODE_LENGTH=6                 # Número de dígitos del código
TWO_FACTOR_CODE_EXPIRES_IN=5m            # 5 minutos
TWO_FACTOR_JWT_SECRET=your-2fa-secret-key

# ========================================
# Rate Limiting (configurado en code, no en .env)
# ========================================
# Login:
#   - Por IP: 10 intentos en 15 minutos
#   - Por usuario: 5 intentos en 15 minutos
#
# Password Reset:
#   - Por IP: 10 intentos en 60 minutos
#
# 2FA:
#   - Por usuario: 5 intentos en 15 minutos

# ========================================
# Frontend URL (para links en emails)
# ========================================
FRONTEND_URL=http://localhost:3000

# ========================================
# Redis (requerido para tokens híbridos)
# ========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Opcional

# ========================================
# Email (para 2FA y password reset)
# ========================================
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
MAIL_FROM_NAME=Your App Name
```

### Configuración de Rate Limiting

Para modificar los límites de rate limiting, edita:

**`src/modules/auth/config/rate-limit.config.ts`**

```typescript
export const RATE_LIMIT_CONFIG = {
  // Login attempts
  login: {
    maxAttemptsByIp: 10,      // Máximo por IP
    maxAttemptsByUser: 5,     // Máximo por usuario
    windowMinutes: 15,        // Ventana de tiempo
  },

  // Password reset requests
  resetPassword: {
    maxAttempts: 10,
    windowMinutes: 60,
  },

  // 2FA code validation
  twoFactor: {
    maxAttempts: 5,
    windowMinutes: 15,
  },
} as const
```

### Configuración de Cookies

**`src/@core/http/services/cookie.service.ts`**

```typescript
setRefreshToken(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,        // ✅ No accesible desde JavaScript (XSS protection)
    secure: isProduction,  // ✅ Solo HTTPS en producción
    sameSite: 'strict',    // ✅ CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/',
  })
}
```

**⚠️ Importante:** No cambies estos valores a menos que sepas lo que haces.

---

## 🔄 Flujos de Autenticación

### 1. Login Flow

```
┌─────────┐                                      ┌─────────┐
│ Cliente │                                      │ Backend │
└────┬────┘                                      └────┬────┘
     │                                                 │
     │  POST /auth/login                              │
     │  { email, password }                           │
     ├────────────────────────────────────────────────>
     │                                                 │
     │            ┌──────────────────────┐             │
     │            │ 1. Check rate limits │             │
     │            │ 2. Validate password │             │
     │            │ 3. Generate tokens   │             │
     │            │ 4. Set cookie        │             │
     │            └──────────────────────┘             │
     │                                                 │
     │  200 OK                                         │
     │  { accessToken, user }                          │
     │  Set-Cookie: refreshToken=...                   │
     <─────────────────────────────────────────────────┤
     │                                                 │
     │  Guardar accessToken en localStorage            │
     │  Cookie guardada automáticamente                │
     │                                                 │
```

**Request:**
```bash
POST /auth/login
Content-Type: application/json

{
  "usernameOrEmail": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-123",
    "email": "admin@example.com",
    "username": "admin",
    "fullName": "Admin User",
    "roles": ["admin"],
    "organizationId": "org-uuid",
    "status": "active"
  }
}

Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/
```

### 2. Refresh Token Flow (Token Rotation)

```
┌─────────┐                                      ┌─────────┐
│ Cliente │                                      │ Backend │
└────┬────┘                                      └────┬────┘
     │                                                 │
     │  POST /auth/refresh                            │
     │  Cookie: refreshToken=old-token                │
     ├────────────────────────────────────────────────>
     │                                                 │
     │            ┌──────────────────────┐             │
     │            │ 1. Validate old JWT  │             │
     │            │ 2. Check Redis exists│             │
     │            │ 3. Revoke old token  │             │
     │            │ 4. Generate new pair │             │
     │            │ 5. Set new cookie    │             │
     │            └──────────────────────┘             │
     │                                                 │
     │  200 OK                                         │
     │  { accessToken }                                │
     │  Set-Cookie: refreshToken=new-token             │
     <─────────────────────────────────────────────────┤
     │                                                 │
     │  Actualizar accessToken en localStorage         │
     │  Nueva cookie reemplaza la anterior             │
     │                                                 │
```

**Request:**
```bash
POST /auth/refresh
Cookie: refreshToken=eyJhbGc...
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Set-Cookie: refreshToken=new-token...; HttpOnly; Secure; SameSite=Strict
```

**⚠️ Importante:** El refresh token viejo se revoca inmediatamente (token rotation). Si alguien intercepta el token viejo, no podrá usarlo.

### 3. Logout Flow

```
┌─────────┐                                      ┌─────────┐
│ Cliente │                                      │ Backend │
└────┬────┘                                      └────┬────┘
     │                                                 │
     │  POST /auth/logout                             │
     │  Authorization: Bearer access-token            │
     │  Cookie: refreshToken=...                      │
     ├────────────────────────────────────────────────>
     │                                                 │
     │            ┌──────────────────────┐             │
     │            │ 1. Blacklist access  │             │
     │            │ 2. Revoke refresh    │             │
     │            │ 3. Clear cookie      │             │
     │            └──────────────────────┘             │
     │                                                 │
     │  204 No Content                                 │
     │  Set-Cookie: refreshToken=; expires=Thu...      │
     <─────────────────────────────────────────────────┤
     │                                                 │
     │  Eliminar accessToken de localStorage           │
     │  Cookie eliminada automáticamente               │
     │                                                 │
```

### 4. Password Reset Flow

```
┌─────────┐                              ┌─────────┐        ┌───────┐
│ Cliente │                              │ Backend │        │ Email │
└────┬────┘                              └────┬────┘        └───┬───┘
     │                                         │                 │
     │  POST /auth/password/request-reset     │                 │
     │  { email }                              │                 │
     ├────────────────────────────────────────>│                 │
     │                                         │                 │
     │         ┌───────────────────┐           │                 │
     │         │ 1. Check rate     │           │                 │
     │         │ 2. Find user      │           │                 │
     │         │ 3. Generate token │           │                 │
     │         │ 4. Store in Redis │           │                 │
     │         └───────────────────┘           │                 │
     │                                         │                 │
     │                                         │  Send email     │
     │                                         ├────────────────>│
     │                                         │                 │
     │  200 OK (generic message)               │                 │
     │  "Si el email existe, recibirás..."     │                 │
     <─────────────────────────────────────────┤                 │
     │                                         │                 │
     │                                         │                 │
     │  Usuario recibe email con link          │                 │
     │  http://frontend/reset?token=jwt-token  │                 │
     <─────────────────────────────────────────┼─────────────────┤
     │                                         │                 │
     │  POST /auth/password/reset              │                 │
     │  { token, newPassword }                 │                 │
     ├────────────────────────────────────────>│                 │
     │                                         │                 │
     │         ┌───────────────────┐           │                 │
     │         │ 1. Validate JWT   │           │                 │
     │         │ 2. Check Redis    │           │                 │
     │         │ 3. Update password│           │                 │
     │         │ 4. Revoke all     │           │                 │
     │         │    sessions       │           │                 │
     │         │ 5. Delete token   │           │                 │
     │         └───────────────────┘           │                 │
     │                                         │                 │
     │  200 OK                                 │                 │
     │  "Password actualizada"                 │                 │
     <─────────────────────────────────────────┤                 │
     │                                         │                 │
```

### 5. Two-Factor Authentication (2FA) Flow

```
┌─────────┐                              ┌─────────┐        ┌───────┐
│ Cliente │                              │ Backend │        │ Email │
└────┬────┘                              └────┬────┘        └───┬───┘
     │                                         │                 │
     │  POST /auth/2fa/generate                │                 │
     │  { userId }                             │                 │
     ├────────────────────────────────────────>│                 │
     │                                         │                 │
     │         ┌───────────────────┐           │                 │
     │         │ 1. Generate code  │           │                 │
     │         │    (123456)       │           │                 │
     │         │ 2. Store in Redis │           │                 │
     │         │ 3. Generate JWT   │           │                 │
     │         └───────────────────┘           │                 │
     │                                         │                 │
     │                                         │  Send code      │
     │                                         ├────────────────>│
     │                                         │                 │
     │  200 OK                                 │                 │
     │  { token: "jwt-with-tokenId" }          │                 │
     <─────────────────────────────────────────┤                 │
     │                                         │                 │
     │  Guardar token para validación          │                 │
     │                                         │                 │
     │  Usuario recibe email: "Tu código: 123456"               │
     <─────────────────────────────────────────┼─────────────────┤
     │                                         │                 │
     │  POST /auth/2fa/verify                  │                 │
     │  { userId, code: "123456", token }      │                 │
     ├────────────────────────────────────────>│                 │
     │                                         │                 │
     │         ┌───────────────────┐           │                 │
     │         │ 1. Validate JWT   │           │                 │
     │         │ 2. Check Redis    │           │                 │
     │         │ 3. Compare code   │           │                 │
     │         │ 4. Delete from    │           │                 │
     │         │    Redis (one-    │           │                 │
     │         │    time use)      │           │                 │
     │         └───────────────────┘           │                 │
     │                                         │                 │
     │  200 OK                                 │                 │
     │  { valid: true }                        │                 │
     <─────────────────────────────────────────┤                 │
     │                                         │                 │
```

---

## 🛡️ Seguridad

### Protecciones Implementadas

| Ataque | Protección | Implementación |
|--------|-----------|----------------|
| **Brute Force** | Rate limiting por IP y usuario | LoginRateLimitPolicy |
| **XSS** | HTTP-only cookies | CookieService |
| **CSRF** | SameSite=Strict cookies | CookieService |
| **Token Theft** | Token rotation + blacklist | RefreshTokenUseCase |
| **Timing Attacks** | Mensajes genéricos en reset | RequestResetPasswordUseCase |
| **Password Leaks** | Bcrypt con 10 rounds | PasswordHashService |
| **Token Reuse** | One-time use (2FA, reset) | Redis TTL + delete |
| **SQL Injection** | TypeORM + DTOs validados | class-validator |

### Rate Limiting en Acción

```typescript
// Ejemplo: Login con rate limiting
try {
  await login({ email: 'user@example.com', password: 'wrong' })
} catch (error) {
  // Intento 1: falla
}

// ... 4 intentos más con password incorrecta

try {
  await login({ email: 'user@example.com', password: 'wrong' })
} catch (error) {
  // Intento 6: bloqueado
  // Error: "Demasiados intentos fallidos. Intenta en 15 minutos"
}
```

### Sistema de Blacklist

Cuando un usuario hace logout, su access token se agrega a una blacklist en Redis:

```typescript
// 1. Logout
POST /auth/logout

// 2. Access token se blacklistea
Redis: SET "blacklist:token-abc123" "userId" EX 900
       // Expira en 900 segundos (TTL restante del token)

// 3. Intentar usar el token
GET /users/me
Authorization: Bearer token-abc123

// 4. JwtStrategy verifica blacklist
const isBlacklisted = await redis.exists("blacklist:token-abc123")
// → true → throw UnauthorizedException
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ Public | Login con email/username y password |
| POST | `/auth/refresh` | ❌ Public | Renovar access token (usa cookie) |
| POST | `/auth/logout` | ✅ Protected | Cerrar sesión y revocar tokens |

### Password Reset

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/password/request-reset` | ❌ Public | Solicitar token de reset (envía email) |
| POST | `/auth/password/reset` | ❌ Public | Resetear password con token válido |

### Two-Factor Authentication

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/2fa/generate` | ❌ Public | Generar código 2FA (envía email) |
| POST | `/auth/2fa/verify` | ❌ Public | Verificar código 2FA |
| POST | `/auth/2fa/resend` | ❌ Public | Reenviar código 2FA |

### Detalles de Endpoints

Ver documentación completa en `/api` (Swagger) cuando la aplicación esté corriendo.

---

## 💻 Uso en Frontend

### Setup Axios con Interceptores

Ver archivo completo: `docs/FRONTEND_INTEGRATION.md`

**Resumen:**

```typescript
// 1. Configurar Axios
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true, // ✅ CRÍTICO para cookies
})

// 2. Interceptor para agregar access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 3. Interceptor para manejar 401 (auto-refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      const { data } = await api.post('/auth/refresh')
      localStorage.setItem('accessToken', data.accessToken)
      error.config.headers.Authorization = `Bearer ${data.accessToken}`
      return api(error.config)
    }
    return Promise.reject(error)
  }
)
```

### Login

```typescript
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { usernameOrEmail: email, password })

  // Guardar access token
  localStorage.setItem('accessToken', response.data.accessToken)

  // Cookie se guarda automáticamente

  return response.data.user
}
```

### Logout

```typescript
const logout = async () => {
  await api.post('/auth/logout')
  localStorage.removeItem('accessToken')
  // Cookie se elimina automáticamente
}
```

---

## 🐛 Troubleshooting

### Problema: "Refresh token no encontrado"

**Causa:** La cookie no se está enviando.

**Solución:**
```typescript
// Frontend: Asegúrate de tener withCredentials
axios.create({
  withCredentials: true // ✅
})

// Backend: Verifica CORS
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true // ✅
})
```

### Problema: "JWT_REFRESH_SECRET is required"

**Causa:** Falta variable de entorno.

**Solución:**
```bash
# .env
JWT_REFRESH_SECRET=your-secret-here
```

### Problema: Rate limiting no funciona

**Causa:** Redis no está conectado.

**Solución:**
```bash
# Verificar Redis
docker ps | grep redis

# Ver logs
docker logs atr_redis
```

### Problema: Tokens no se revocan

**Causa:** Redis keys con TTL incorrectos.

**Solución:**
```bash
# Conectar a Redis
redis-cli

# Ver todas las keys
KEYS *

# Ver TTL de un token
TTL auth:refresh:user-123:token-456

# Debería retornar número positivo (segundos restantes)
```

---

## 📚 Documentación Adicional

- [Integración con Frontend](./docs/FRONTEND_INTEGRATION.md)
- [Tests](./docs/TESTING.md)
- [Arquitectura de Tokens](./docs/TOKEN_ARCHITECTURE.md)
- [Configuración Avanzada](./docs/ADVANCED_CONFIG.md)

---

## 🤝 Contribuir

Al agregar nuevas features de autenticación:

1. ✅ Agregar rate limiting apropiado
2. ✅ Usar sistema híbrido (JWT + Redis) si el token debe ser revocable
3. ✅ Agregar tests unitarios y E2E
4. ✅ Documentar en este README
5. ✅ Actualizar Swagger

---

## 📝 Changelog

### v1.0.0 (Actual)
- ✅ Login con JWT + refresh tokens
- ✅ Rate limiting multi-nivel
- ✅ Password reset con tokens híbridos
- ✅ Two-factor authentication
- ✅ Token rotation
- ✅ Blacklist de tokens
- ✅ Tests unitarios y E2E
