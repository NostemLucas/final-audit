# 🔑 Token Architecture - Sistema Híbrido JWT + Redis

Explicación técnica profunda del sistema de tokens y por qué usamos un enfoque híbrido.

## 📋 Tabla de Contenidos

- [Problema a Resolver](#problema-a-resolver)
- [Soluciones y Trade-offs](#soluciones-y-trade-offs)
- [Nuestra Solución: Sistema Híbrido](#nuestra-solución-sistema-híbrido)
- [Implementación Detallada](#implementación-detallada)
- [Flujos de Tokens](#flujos-de-tokens)
- [Seguridad](#seguridad)
- [Performance](#performance)

---

## ❓ Problema a Resolver

### Requisitos Contradictorios

1. **Stateless** - No queremos consultar DB en cada request
2. **Revocable** - Necesitamos poder invalidar tokens inmediatamente
3. **Seguro** - Resistente a robo y reutilización
4. **Escalable** - Debe funcionar con millones de usuarios

### Opciones Tradicionales

| Enfoque | Stateless | Revocable | Seguro | Escalable | Problema |
|---------|-----------|-----------|--------|-----------|----------|
| **Session DB** | ❌ | ✅ | ✅ | ⚠️ | DB query en cada request |
| **JWT Puro** | ✅ | ❌ | ⚠️ | ✅ | No revocable hasta expiración |
| **JWT + Blacklist** | ⚠️ | ⚠️ | ✅ | ⚠️ | Blacklist crece indefinidamente |
| **Redis Sessions** | ❌ | ✅ | ✅ | ✅ | Requiere Redis en cada request |

**Ninguna opción cumple todos los requisitos** ❌

---

## 🎯 Soluciones y Trade-offs

### Opción 1: JWT Puro (Stateless)

```typescript
// ✅ Ventajas
- Sin DB/Redis queries
- Escalable horizontalmente
- Simple de implementar

// ❌ Desventajas
- No revocable (válido hasta exp)
- Si se roba, no puedes invalidarlo
- Requiere expiración corta (mal UX)
```

**Ejemplo de ataque:**
```
1. Usuario hace login → recibe JWT válido por 7 días
2. Atacante roba el JWT
3. Usuario hace logout
4. ❌ Atacante sigue usando el JWT por 7 días (no hay forma de revocarlo)
```

### Opción 2: Sessions en Base de Datos

```typescript
// ✅ Ventajas
- Totalmente revocable
- Control total sobre sesiones
- Tradicional y bien entendido

// ❌ Desventajas
- DB query en CADA request
- No escala bien
- Punto único de fallo
```

**Impacto de performance:**
```
1000 requests/segundo = 1000 DB queries/segundo
→ Alto load en PostgreSQL
→ Requiere connection pooling agresivo
→ Requiere cache (Redis) de todas formas
```

### Opción 3: JWT + Blacklist

```typescript
// ✅ Ventajas
- Stateless para tokens válidos
- Revocable (agregar a blacklist)

// ❌ Desventajas
- Blacklist crece indefinidamente
- Requiere Redis check en cada request
- Almacenamiento crece con el tiempo
```

**Problema de almacenamiento:**
```
Blacklist key: "blacklist:token-abc123"
TTL: Tiempo restante del token

Si token expira en 7 días:
→ Key se mantiene por 7 días
→ 1M usuarios activos = 1M keys
→ Después de logout, keys permanecen hasta expiración
```

---

## ✨ Nuestra Solución: Sistema Híbrido

### Arquitectura

```
┌─────────────────────────────────────────────────────┐
│  Access Token (Short-lived, 15 min)                 │
│  ─────────────────────────────────────────────────  │
│  Tipo: JWT Puro                                     │
│  Almacenado: localStorage/memoria (frontend)        │
│  Validación: Solo firma JWT (sin Redis)             │
│  Revocable: Sí, vía blacklist (solo en logout)     │
│  Uso: Authorization header en cada request          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Refresh Token (Long-lived, 7 days)                 │
│  ─────────────────────────────────────────────────  │
│  Tipo: JWT + Redis (Híbrido)                        │
│  Almacenado: HTTP-only cookie (frontend)            │
│  Validación: JWT signature + Redis exists           │
│  Revocable: Sí, eliminar de Redis                   │
│  Uso: Solo en /auth/refresh endpoint                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Tokens de Seguridad (Reset, 2FA)                   │
│  ─────────────────────────────────────────────────  │
│  Tipo: JWT + Redis (Híbrido)                        │
│  Almacenado: Email (reset) o código (2FA)           │
│  Validación: JWT signature + Redis exists           │
│  One-time use: Sí (eliminar después de validar)    │
│  TTL: Corto (1h reset, 5m 2FA)                     │
└─────────────────────────────────────────────────────┘
```

### Ventajas del Híbrido

| Característica | Access Token | Refresh Token | Resultado |
|---------------|--------------|---------------|-----------|
| **Validación** | Solo JWT | JWT + Redis | ⚡ Rápido en requests frecuentes |
| **Revocable** | Blacklist | Redis delete | ✅ Revocación inmediata |
| **Almacenamiento** | Mínimo | Moderado | 💾 Redis solo para tokens activos |
| **Seguridad** | Corta vida | HTTP-only + rotation | 🔒 Máxima seguridad |

### Cómo Funciona

```typescript
// ========================================
// 1. LOGIN
// ========================================
POST /auth/login

Backend:
1. Validar credenciales
2. Generar tokenId único (UUID)
3. Crear Access JWT:
   - Payload: { sub: userId, email, roles }
   - Expiración: 15 minutos
   - NO se almacena en Redis

4. Crear Refresh JWT:
   - Payload: { sub: userId, tokenId }
   - Expiración: 7 días
   - Almacenar tokenId en Redis:
     Key: "auth:refresh:userId:tokenId"
     TTL: 7 días

5. Retornar:
   - Access token en response body
   - Refresh token en HTTP-only cookie

// ========================================
// 2. REQUEST AUTENTICADO
// ========================================
GET /users/me
Authorization: Bearer <access-token>

Backend:
1. JwtStrategy valida firma (rápido, sin Redis)
2. Verificar si está en blacklist (solo si logout previo)
3. Si válido, adjuntar user a request.user
4. ✅ Request continúa

Performance: ~1ms (solo verificación de firma)

// ========================================
// 3. REFRESH TOKEN
// ========================================
POST /auth/refresh
Cookie: refreshToken=<refresh-jwt>

Backend:
1. Decodificar Refresh JWT
2. Validar firma
3. Extraer userId y tokenId
4. Verificar en Redis:
   EXISTS auth:refresh:userId:tokenId
5. Si existe:
   - Revocar token viejo (DEL Redis)
   - Generar nuevo tokenId
   - Crear nuevos access + refresh tokens
   - Almacenar nuevo tokenId en Redis
   - Retornar nuevo access token
   - Setear nueva cookie con refresh token

Performance: ~5ms (1 Redis read + 1 Redis write)

// ========================================
// 4. LOGOUT
// ========================================
POST /auth/logout
Authorization: Bearer <access-token>
Cookie: refreshToken=<refresh-jwt>

Backend:
1. Blacklist access token:
   Key: "blacklist:access-token"
   TTL: Tiempo restante del token (max 15 min)

2. Revocar refresh token:
   DEL auth:refresh:userId:tokenId

3. Limpiar cookie

Performance: ~3ms (2 Redis writes)
```

---

## 🔧 Implementación Detallada

### Estructura de Redis Keys

```bash
# Refresh Tokens
auth:refresh:{userId}:{tokenId}
Valor: timestamp de creación
TTL: 7 días (604800 segundos)

Ejemplo:
auth:refresh:user-123:token-abc-456
→ TTL: 604800
→ Valor: "1705123456789"

# Access Token Blacklist (solo en logout)
blacklist:{accessToken}
Valor: userId
TTL: Tiempo restante del token (max 15 min)

Ejemplo:
blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
→ TTL: 900 (15 minutos)
→ Valor: "user-123"

# Password Reset Tokens
auth:reset-password:{userId}:{tokenId}
Valor: timestamp
TTL: 1 hora (3600 segundos)

# 2FA Codes
auth:2fa:{userId}:{tokenId}
Valor: código numérico
TTL: 5 minutos (300 segundos)
```

### Token Payload

```typescript
// Access Token JWT
interface AccessTokenPayload {
  sub: string              // User ID
  email: string
  username: string
  roles: string[]
  organizationId: string
  iat: number             // Issued at
  exp: number             // Expiration
}

// Refresh Token JWT
interface RefreshTokenPayload {
  sub: string              // User ID
  tokenId: string          // ID almacenado en Redis
  iat: number
  exp: number
}

// Reset Password Token JWT
interface ResetPasswordTokenPayload {
  sub: string              // User ID
  tokenId: string          // ID almacenado en Redis
  purpose: 'password-reset'
  iat: number
  exp: number
}

// 2FA Token JWT
interface TwoFactorTokenPayload {
  sub: string              // User ID
  tokenId: string          // ID almacenado en Redis (apunta al código)
  purpose: '2fa'
  iat: number
  exp: number
}
```

### Servicios Implementados

#### 1. TokensService (Access + Refresh)

```typescript
@Injectable()
export class TokensService {
  // Generar par de tokens
  async generateTokenPair(user: UserEntity) {
    const tokenId = uuid()

    // Access token (sin Redis)
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      // ... más datos
    }, { expiresIn: '15m' })

    // Refresh token (con Redis)
    const refreshToken = this.jwtService.sign({
      sub: user.id,
      tokenId,
    }, {
      expiresIn: '7d',
      secret: this.refreshSecret,
    })

    // Almacenar en Redis
    await this.redis.set(
      `auth:refresh:${user.id}:${tokenId}`,
      Date.now().toString(),
      'EX',
      7 * 24 * 60 * 60 // 7 días
    )

    return { accessToken, refreshToken }
  }

  // Validar refresh token
  async validateRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const exists = await this.redis.exists(`auth:refresh:${userId}:${tokenId}`)
    return exists === 1
  }

  // Revocar refresh token
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(`auth:refresh:${userId}:${tokenId}`)
  }

  // Blacklist access token
  async blacklistAccessToken(token: string, userId: string): Promise<void> {
    const decoded = this.jwtService.verify(token)
    const ttl = decoded.exp * 1000 - Date.now()

    if (ttl > 0) {
      await this.redis.set(
        `blacklist:${token}`,
        userId,
        'PX', // milliseconds
        ttl
      )
    }
  }

  // Verificar blacklist
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const exists = await this.redis.exists(`blacklist:${token}`)
    return exists === 1
  }
}
```

#### 2. ResetPasswordTokenService

```typescript
@Injectable()
export class ResetPasswordTokenService {
  async generateToken(userId: string): Promise<string> {
    const tokenId = uuid()

    // Almacenar en Redis
    await this.redis.set(
      `auth:reset-password:${userId}:${tokenId}`,
      Date.now().toString(),
      'EX',
      60 * 60 // 1 hora
    )

    // Generar JWT
    const token = this.jwtService.sign(
      { sub: userId, tokenId, purpose: 'password-reset' },
      { expiresIn: '1h', secret: this.resetSecret }
    )

    return token
  }

  async validateToken(token: string): Promise<string | null> {
    try {
      // 1. Verificar JWT
      const decoded = this.jwtService.verify(token, { secret: this.resetSecret })

      // 2. Verificar Redis
      const exists = await this.redis.exists(
        `auth:reset-password:${decoded.sub}:${decoded.tokenId}`
      )

      if (exists !== 1) {
        return null // Token revocado o expirado
      }

      return decoded.sub // userId
    } catch {
      return null
    }
  }

  async revokeToken(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token)
    await this.redis.del(`auth:reset-password:${decoded.sub}:${decoded.tokenId}`)
  }
}
```

#### 3. TwoFactorTokenService

```typescript
@Injectable()
export class TwoFactorTokenService {
  async generateCode(userId: string): Promise<{ code: string; token: string }> {
    const tokenId = uuid()
    const code = Math.floor(100000 + Math.random() * 900000).toString() // 6 dígitos

    // Almacenar código en Redis
    await this.redis.set(
      `auth:2fa:${userId}:${tokenId}`,
      code,
      'EX',
      5 * 60 // 5 minutos
    )

    // Generar JWT (no contiene el código, solo el tokenId)
    const token = this.jwtService.sign(
      { sub: userId, tokenId, purpose: '2fa' },
      { expiresIn: '5m', secret: this.twoFactorSecret }
    )

    return { code, token }
  }

  async validateCode(userId: string, code: string, token: string): Promise<boolean> {
    try {
      // 1. Verificar JWT
      const decoded = this.jwtService.verify(token, { secret: this.twoFactorSecret })

      if (decoded.sub !== userId) {
        return false
      }

      // 2. Obtener código de Redis
      const storedCode = await this.redis.get(`auth:2fa:${userId}:${decoded.tokenId}`)

      if (!storedCode || storedCode !== code) {
        return false
      }

      // 3. One-time use: eliminar después de validar
      await this.redis.del(`auth:2fa:${userId}:${decoded.tokenId}`)

      return true
    } catch {
      return false
    }
  }
}
```

---

## 🔒 Seguridad

### Token Rotation (Refresh)

```
Request 1: Refresh con token A
Backend:
  1. Validar token A
  2. Revocar token A ← CRÍTICO
  3. Generar token B
  4. Almacenar token B
  5. Retornar token B

Request 2: Refresh con token A (stolen)
Backend:
  1. Validar token A
  2. Verificar Redis → NO EXISTE
  3. Rechazar (token revocado)

Resultado: Atacante no puede reutilizar token A
```

### One-Time Use (2FA, Reset)

```
1. Generar código 2FA: "123456"
   Redis: auth:2fa:user:tokenId → "123456"

2. Validar código correcto
   Redis: GET auth:2fa:user:tokenId → "123456"
   Comparar: "123456" === "123456" ✅
   Redis: DEL auth:2fa:user:tokenId ← Eliminar

3. Intentar reusar
   Redis: GET auth:2fa:user:tokenId → NULL
   Resultado: Rechazado ❌
```

### Timing Attack Prevention

```typescript
// ❌ MAL: Revela si el email existe
if (!user) {
  return { error: 'Usuario no encontrado' }
}
// ... enviar email

// ✅ BIEN: Mensaje genérico siempre
const user = await this.usersRepository.findByEmail(email)

if (user) {
  await this.sendResetEmail(user)
}

// Siempre retornar el mismo mensaje
return {
  message: 'Si el email existe, recibirás un link de reset'
}
```

---

## ⚡ Performance

### Comparación de Latencia

```
Petición normal (JWT puro):
├─ Validar firma JWT: ~0.5ms
└─ Total: ~0.5ms

Petición con refresh:
├─ Validar firma JWT: ~0.5ms
├─ Redis EXISTS: ~1ms
├─ Redis DEL: ~1ms
├─ Redis SET: ~1ms
└─ Total: ~3.5ms

Logout:
├─ Redis SET (blacklist): ~1ms
├─ Redis DEL (refresh): ~1ms
└─ Total: ~2ms
```

### Almacenamiento Redis

```
Usuario activo (1 refresh token):
├─ Key: auth:refresh:userId:tokenId
├─ Tamaño: ~100 bytes
└─ TTL: 7 días

1 millón de usuarios:
├─ Almacenamiento: ~100 MB
└─ Aceptable para Redis
```

### Escalabilidad

```
1000 requests/segundo:
├─ Access token validation: Solo JWT (sin Redis)
├─ Refresh (1% del tráfico): 10 Redis ops/seg
└─ Resultado: Fácilmente escalable
```

---

## 📝 Conclusiones

### ¿Por qué Híbrido?

1. **Performance**: 99% de requests usan solo JWT (rápido)
2. **Seguridad**: Refresh tokens revocables inmediatamente
3. **Almacenamiento**: Solo tokens activos en Redis
4. **Escalabilidad**: Redis solo para operaciones críticas
5. **UX**: Sesiones largas (7 días) sin sacrificar seguridad

### Trade-offs Aceptados

- ✅ Overhead mínimo de Redis en refresh
- ✅ Complejidad adicional en implementación
- ✅ Requiere Redis disponible

### Alternativas Consideradas y Descartadas

| Alternativa | Por qué NO |
|-------------|------------|
| JWT puro | No revocable |
| Sessions DB | DB query en cada request |
| OAuth2 puro | Demasiado complejo para el caso de uso |
| API Keys | No tienen expiración |

**Conclusión**: El sistema híbrido es el mejor balance entre seguridad, performance y UX para este proyecto.
