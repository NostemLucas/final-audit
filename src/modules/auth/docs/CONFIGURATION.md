# ⚙️ Configuración Avanzada - Auth Module

Guía completa de configuración del módulo de autenticación.

## 📋 Tabla de Contenidos

- [Variables de Entorno](#variables-de-entorno)
- [Configuración de Rate Limiting](#configuración-de-rate-limiting)
- [Configuración de Tokens](#configuración-de-tokens)
- [Configuración de Cookies](#configuración-de-cookies)
- [Configuración de Email](#configuración-de-email)
- [Opciones Avanzadas](#opciones-avanzadas)

---

## 🔐 Variables de Entorno

### JWT Access Token

```bash
# Secret para firmar access tokens
# REQUERIDO | No hay default por seguridad
# Recomendado: Mínimo 32 caracteres, aleatorio
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars

# Tiempo de expiración de access tokens
# OPCIONAL | Default: 15m
# Formato: https://github.com/vercel/ms
# Ejemplos: '15m', '1h', '7d'
JWT_EXPIRES_IN=15m
```

**⚠️ Importante:**
- Usa `openssl rand -base64 32` para generar secretos seguros
- NUNCA compartas el JWT_SECRET en git
- Usa diferentes secretos para dev/staging/production

**Recomendaciones de expiración:**

| Ambiente | Duración | Razón |
|----------|----------|-------|
| Development | 1h | Evitar refresh frecuente durante desarrollo |
| Staging | 15m | Simular producción |
| Production | 15m | Balance entre seguridad y UX |

### JWT Refresh Token

```bash
# Secret para firmar refresh tokens (DEBE SER DIFERENTE de JWT_SECRET)
# REQUERIDO | No hay default
JWT_REFRESH_SECRET=your-refresh-secret-key-different-from-access

# Tiempo de expiración de refresh tokens
# OPCIONAL | Default: 7d
JWT_REFRESH_EXPIRES_IN=7d
```

**⚠️ Importante:**
- `JWT_REFRESH_SECRET` DEBE ser diferente de `JWT_SECRET`
- Si un atacante obtiene JWT_SECRET, no debería poder generar refresh tokens

**Recomendaciones:**

| Tipo de App | Duración | Razón |
|--------------|----------|-------|
| Web App | 7d | Usuario no necesita re-login frecuente |
| Mobile App | 30d | Mejor UX en móviles |
| API-only | 1h | APIs suelen no tener usuarios humanos |

### Password Reset

```bash
# Secret para firmar tokens de reset
# REQUERIDO | No hay default
RESET_PASSWORD_JWT_SECRET=your-reset-password-secret-key

# Tiempo de expiración de tokens de reset
# OPCIONAL | Default: 1h
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h
```

**Recomendaciones:**
- 30m - 1h para máxima seguridad
- Máximo 2h (más tiempo = más riesgo de robo)

### Two-Factor Authentication

```bash
# Secret para firmar tokens 2FA
# REQUERIDO | No hay default
TWO_FACTOR_JWT_SECRET=your-2fa-secret-key

# Longitud del código numérico
# OPCIONAL | Default: 6
# Valores permitidos: 4-8
TWO_FACTOR_CODE_LENGTH=6

# Tiempo de expiración del código
# OPCIONAL | Default: 5m
TWO_FACTOR_CODE_EXPIRES_IN=5m
```

**Recomendaciones:**

| Longitud | Combinaciones | Seguridad | UX |
|----------|---------------|-----------|-----|
| 4 dígitos | 10,000 | ⚠️ Bajo | ✅ Fácil |
| 6 dígitos | 1,000,000 | ✅ Bueno | ✅ OK |
| 8 dígitos | 100,000,000 | ✅ Excelente | ⚠️ Difícil |

### Frontend URL

```bash
# URL del frontend (para links en emails)
# REQUERIDO
FRONTEND_URL=http://localhost:3000

# Producción
FRONTEND_URL=https://app.yourcompany.com
```

---

## 🚦 Configuración de Rate Limiting

### Archivo de Configuración

**`src/modules/auth/config/rate-limit.config.ts`**

```typescript
export const RATE_LIMIT_CONFIG = {
  // Login attempts
  login: {
    maxAttemptsByIp: 10,      // Máximo por IP
    maxAttemptsByUser: 5,     // Máximo por usuario/email
    windowMinutes: 15,        // Ventana de tiempo
  },

  // Password reset requests
  resetPassword: {
    maxAttempts: 10,          // Por IP
    windowMinutes: 60,
  },

  // 2FA code validation
  twoFactor: {
    maxAttempts: 5,           // Por usuario
    windowMinutes: 15,
  },

  // Email operations (2FA send, password reset email)
  emailOperations: {
    maxAttempts: 10,          // Por IP
    windowMinutes: 60,
  },
} as const
```

### Cómo Funciona

```typescript
// Ejemplo: Login rate limiting

// Intento 1-5 (usuario): OK
login('user@example.com', 'wrong-password') // Falla, contador: 1
login('user@example.com', 'wrong-password') // Falla, contador: 2
login('user@example.com', 'wrong-password') // Falla, contador: 3
login('user@example.com', 'wrong-password') // Falla, contador: 4
login('user@example.com', 'wrong-password') // Falla, contador: 5

// Intento 6: BLOQUEADO
login('user@example.com', 'wrong-password')
// → Error: "Demasiados intentos fallidos. Intenta en 15 minutos"

// Después de 15 minutos: Contadores resetean automáticamente
```

### Personalizar Rate Limits

#### Opción 1: Editar el archivo de configuración

```typescript
// src/modules/auth/config/rate-limit.config.ts
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: 20,      // ← Cambiar de 10 a 20
    maxAttemptsByUser: 10,    // ← Cambiar de 5 a 10
    windowMinutes: 30,        // ← Cambiar de 15 a 30
  },
}
```

#### Opción 2: Variables de entorno (si implementas)

```typescript
// src/modules/auth/config/rate-limit.config.ts
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: parseInt(process.env.RATE_LIMIT_LOGIN_IP || '10'),
    maxAttemptsByUser: parseInt(process.env.RATE_LIMIT_LOGIN_USER || '5'),
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15'),
  },
}

// .env
RATE_LIMIT_LOGIN_IP=20
RATE_LIMIT_LOGIN_USER=10
RATE_LIMIT_WINDOW_MINUTES=30
```

### Recomendaciones por Ambiente

```typescript
// Development
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: 100,     // Permisivo para testing
    maxAttemptsByUser: 50,
    windowMinutes: 5,         // Reset rápido
  },
}

// Staging
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: 20,
    maxAttemptsByUser: 10,
    windowMinutes: 15,
  },
}

// Production
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: 10,      // Estricto
    maxAttemptsByUser: 5,
    windowMinutes: 15,
  },
}
```

---

## 🎫 Configuración de Tokens

### Token Payload (No Configurable - Estándar)

```typescript
// Access Token
interface AccessTokenPayload {
  sub: string              // User ID (estándar JWT)
  email: string            // Email del usuario
  username: string         // Username
  roles: string[]          // Roles para autorización
  organizationId: string   // Organización (multi-tenancy)
  iat: number             // Issued at (estándar JWT)
  exp: number             // Expiration (estándar JWT)
}
```

**¿Qué agregar al payload?**

✅ **SÍ agregar:**
- Datos que cambien raramente (roles, email)
- Datos necesarios en cada request (organizationId)
- Datos pequeños (< 1KB total)

❌ **NO agregar:**
- Información sensible (password, API keys)
- Datos que cambien frecuentemente (avatar URL)
- Datos grandes (listas completas)

**Cómo modificar el payload:**

```typescript
// src/modules/auth/services/tokens.service.ts (línea 57)

const accessPayload: JwtPayload = {
  sub: user.id,
  email: user.email,
  username: user.username,
  roles: user.roles,
  organizationId: user.organizationId,
  // ✅ Agregar campos personalizados
  department: user.department,
  locale: user.preferredLocale,
}
```

### Redis Keys TTL

```typescript
// Configuración actual (no modificable vía env)

// Refresh tokens
TTL = JWT_REFRESH_EXPIRES_IN (7 días por default)

// Blacklist access tokens
TTL = Tiempo restante del token (máx 15 minutos)

// Password reset
TTL = RESET_PASSWORD_TOKEN_EXPIRES_IN (1 hora por default)

// 2FA codes
TTL = TWO_FACTOR_CODE_EXPIRES_IN (5 minutos por default)
```

**⚠️ Importante:**
- TTL en Redis debe coincidir con expiración de JWT
- Si modificas JWT_EXPIRES_IN, Redis se adapta automáticamente

---

## 🍪 Configuración de Cookies

### Cookie Settings

**`src/@core/http/services/cookie.service.ts`**

```typescript
setRefreshToken(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,           // ✅ No modificar (seguridad XSS)
    secure: isProduction,     // ✅ No modificar (HTTPS only en prod)
    sameSite: 'strict',       // ⚠️ Modificable con precaución
    maxAge: 7 * 24 * 60 * 60 * 1000, // Configurable
    path: '/',                // ⚠️ Modificable con precaución
  })
}
```

### Opciones Configurables

#### 1. `sameSite` (Protección CSRF)

```typescript
// Opción 1: 'strict' (Recomendado)
sameSite: 'strict'
// ✅ Máxima protección CSRF
// ⚠️ Cookie NO se envía en navegación desde otros sitios
// Ejemplo: Link en email externo → usuario debe re-login

// Opción 2: 'lax'
sameSite: 'lax'
// ⚠️ Menor protección CSRF
// ✅ Cookie se envía en navegación GET desde otros sitios
// Ejemplo: Link en email → usuario mantiene sesión

// Opción 3: 'none' (NO RECOMENDADO)
sameSite: 'none'
// ❌ Sin protección CSRF
// Solo usar con secure: true
```

**Recomendación:** Usa `'strict'` a menos que tengas casos específicos.

#### 2. `maxAge` (Duración)

```typescript
// Debe coincidir con JWT_REFRESH_EXPIRES_IN

// 7 días (default)
maxAge: 7 * 24 * 60 * 60 * 1000

// 30 días (apps móviles)
maxAge: 30 * 24 * 60 * 60 * 1000

// 1 día (máxima seguridad)
maxAge: 1 * 24 * 60 * 60 * 1000
```

#### 3. `path` (Scope)

```typescript
// Opción 1: Toda la app (default)
path: '/'

// Opción 2: Solo rutas de auth
path: '/auth'
// ⚠️ Requiere cambios en frontend
```

### Configuración según Ambiente

```typescript
// Development
{
  httpOnly: true,
  secure: false,            // HTTP OK en dev
  sameSite: 'lax',         // Más permisivo para testing
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
}

// Production
{
  httpOnly: true,
  secure: true,             // Solo HTTPS
  sameSite: 'strict',      // Máxima seguridad
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
}
```

---

## 📧 Configuración de Email

### Variables Requeridas

```bash
# Servidor SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false  # true para puerto 465

# Credenciales
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # NO usar password normal

# Remitente
MAIL_FROM=noreply@yourapp.com
MAIL_FROM_NAME=Your App Name

# Info de la app (para templates)
APP_NAME=Your App
```

### Proveedores Comunes

#### Gmail

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=app-specific-password  # Generar en Google Account settings
```

**⚠️ Importante:**
1. Activar autenticación de 2 pasos en Google
2. Generar "App Password" en configuración de cuenta
3. NO usar tu password normal de Gmail

#### SendGrid

```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey  # Literal "apikey"
MAIL_PASSWORD=your-sendgrid-api-key
```

#### Mailgun

```bash
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=postmaster@your-domain.mailgun.org
MAIL_PASSWORD=your-mailgun-password
```

---

## 🎛️ Opciones Avanzadas

### 1. Deshabilitar Auto-Refresh en JwtStrategy (NO RECOMENDADO)

Por defecto, JwtStrategy verifica que el usuario existe en cada request.

```typescript
// src/modules/auth/strategies/jwt.strategy.ts (línea 65)

async validate(req: Request, payload: JwtPayload) {
  // ...

  // Opción 1: Verificar usuario (default - más seguro)
  const user = await this.usersRepository.findById(payload.sub)
  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado')
  }

  // Opción 2: Solo validar JWT (más rápido - menos seguro)
  // ⚠️ Quitar verificación de usuario
  // return payload

  return payload
}
```

**Trade-off:**
- ✅ Más rápido (sin DB query)
- ❌ Usuario eliminado puede seguir autenticado hasta que expire el token

### 2. Cambiar Formato de Cookies

```typescript
// src/modules/auth/controllers/auth.controller.ts

// Opción actual: HTTP-only cookie
this.cookieService.setRefreshToken(res, refreshToken)

// Opción alternativa: Retornar en response body (NO RECOMENDADO)
return {
  accessToken,
  refreshToken, // ⚠️ Menos seguro (vulnerable a XSS)
}
```

### 3. Agregar Fingerprinting (Máxima Seguridad)

```typescript
// TODO: Implementar fingerprinting para detectar robo de tokens

// Concepto:
// 1. Generar fingerprint del dispositivo (User-Agent, IP, etc)
// 2. Almacenar hash del fingerprint en Redis con el token
// 3. Validar fingerprint en cada refresh
// 4. Si cambia → posible robo → revocar token
```

### 4. Multi-Device Sessions

```typescript
// TODO: Permitir múltiples refresh tokens por usuario

// Concepto actual: 1 token por usuario
// Concepto mejorado: N tokens por usuario (1 por dispositivo)

// Implementación:
// - Modificar TokensService.generateTokenPair() para agregar deviceId
// - Modificar Redis keys: auth:refresh:{userId}:{deviceId}:{tokenId}
// - Agregar endpoint /auth/devices para listar dispositivos activos
// - Agregar endpoint /auth/revoke-device para cerrar sesión remota
```

---

## 🔧 Ejemplos de Configuración Completa

### Development

```bash
# .env.development

# JWT
JWT_SECRET=dev-secret-not-secure-for-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Password Reset
RESET_PASSWORD_JWT_SECRET=dev-reset-secret
RESET_PASSWORD_TOKEN_EXPIRES_IN=2h

# 2FA
TWO_FACTOR_JWT_SECRET=dev-2fa-secret
TWO_FACTOR_CODE_LENGTH=6
TWO_FACTOR_CODE_EXPIRES_IN=10m

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (Ethereal para testing)
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=generated-ethereal-user
MAIL_PASSWORD=generated-ethereal-password
```

### Production

```bash
# .env.production

# JWT (secretos generados con openssl rand -base64 32)
JWT_SECRET=<generated-secret-32-chars-min>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different-generated-secret>
JWT_REFRESH_EXPIRES_IN=7d

# Password Reset
RESET_PASSWORD_JWT_SECRET=<another-generated-secret>
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h

# 2FA
TWO_FACTOR_JWT_SECRET=<yet-another-generated-secret>
TWO_FACTOR_CODE_LENGTH=6
TWO_FACTOR_CODE_EXPIRES_IN=5m

# Frontend
FRONTEND_URL=https://app.yourcompany.com

# Email (SendGrid production)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey
MAIL_PASSWORD=<sendgrid-api-key>
MAIL_FROM=noreply@yourcompany.com
MAIL_FROM_NAME=Your Company
```

---

## ✅ Checklist de Configuración

- [ ] Generar secretos seguros con `openssl rand -base64 32`
- [ ] Configurar diferentes secretos para access, refresh, reset, 2FA
- [ ] Ajustar expiraciones según tipo de aplicación
- [ ] Configurar rate limiting apropiado para el ambiente
- [ ] Configurar SMTP con credenciales válidas
- [ ] Verificar CORS en backend (`credentials: true`)
- [ ] Verificar frontend usa `withCredentials: true`
- [ ] Configurar HTTPS en producción
- [ ] Probar flujo completo en staging antes de producción

---

## 📚 Referencias

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [ms Format](https://github.com/vercel/ms)
