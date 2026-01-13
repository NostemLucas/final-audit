# Gestión de Tokens en el Módulo Auth

Este documento explica la arquitectura estandarizada de tokens en el módulo de autenticación, que soporta múltiples tipos de tokens temporales (refresh, reset password, 2FA) con almacenamiento flexible (Redis, JWT, o ambos).

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Servicios Disponibles](#servicios-disponibles)
- [Configuración](#configuración)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Mejores Prácticas](#mejores-prácticas)

---

## Arquitectura

### Componentes Principales

1. **TokenStorageService** (`@core/cache`)
   - Servicio genérico base para operaciones de Redis
   - Maneja CRUD de tokens con TTL
   - Soporta metadata adicional
   - Usado por todos los servicios específicos de tokens

2. **TokensService** (Refresh Tokens)
   - Gestiona access y refresh tokens
   - Blacklist de access tokens
   - Token rotation automática

3. **ResetPasswordTokenService**
   - Tokens de reset de contraseña
   - Soporta 3 modos: Redis, JWT, Híbrido

4. **TwoFactorTokenService**
   - Códigos 2FA temporales
   - Generación de códigos numéricos
   - One-time use (se revocan al validar)

### Modos de Operación

Cada servicio (excepto TokensService) soporta 3 modos configurables por ENV:

| Modo | Descripción | Ventajas | Desventajas |
|------|-------------|----------|-------------|
| **redis** | Tokens almacenados solo en Redis | Revocables, más seguro | Requiere Redis, stateful |
| **jwt** | Tokens firmados como JWT | Stateless, portable | No revocables antes de expirar |
| **both** | JWT + validación contra Redis | Lo mejor de ambos mundos | Mayor complejidad |

---

## Servicios Disponibles

### 1. TokenStorageService

**Ubicación**: `src/@core/cache/token-storage.service.ts`

Servicio genérico para operaciones de Redis. No se usa directamente, sino a través de los servicios específicos.

#### Métodos Principales

```typescript
// Almacenar token
await tokenStorage.storeToken(userId, tokenId, {
  prefix: 'auth:custom',
  ttlSeconds: 3600,
})

// Validar token
const isValid = await tokenStorage.validateToken(userId, tokenId, prefix)

// Revocar token
await tokenStorage.revokeToken(userId, tokenId, prefix)

// Revocar todos los tokens de un usuario
await tokenStorage.revokeAllUserTokens(userId, prefix)

// Obtener datos del token
const data = await tokenStorage.getTokenData(userId, tokenId, prefix)

// Generar ID único
const tokenId = tokenStorage.generateTokenId()
```

---

### 2. TokensService (Refresh Tokens)

**Ubicación**: `src/modules/auth/services/tokens.service.ts`

Gestiona access tokens (corta duración) y refresh tokens (larga duración).

#### Configuración (ENV)

```bash
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

#### Uso

```typescript
import { TokensService } from '@modules/auth/services'

@Injectable()
export class LoginUseCase {
  constructor(private readonly tokensService: TokensService) {}

  async execute(user: UserEntity) {
    // Generar par de tokens
    const { accessToken, refreshToken } =
      await this.tokensService.generateTokenPair(user)

    // Validar refresh token
    const isValid = await this.tokensService.validateRefreshToken(
      userId,
      tokenId,
    )

    // Revocar refresh token (logout)
    await this.tokensService.revokeRefreshToken(userId, tokenId)

    // Blacklist access token
    await this.tokensService.blacklistAccessToken(accessToken, userId)

    // Verificar si access token está revocado
    const isBlacklisted = await this.tokensService.isTokenBlacklisted(accessToken)

    // Revocar todas las sesiones (cambio de contraseña)
    await this.tokensService.revokeAllUserTokens(userId)

    return { accessToken, refreshToken }
  }
}
```

---

### 3. ResetPasswordTokenService

**Ubicación**: `src/modules/auth/services/reset-password-token.service.ts`

Gestiona tokens de reset de contraseña con soporte para Redis, JWT o ambos.

#### Configuración (ENV)

```bash
# Modo: 'redis' | 'jwt' | 'both'
RESET_PASSWORD_TOKEN_MODE=redis
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h

# Solo requerido si mode es 'jwt' o 'both'
RESET_PASSWORD_JWT_SECRET=your-secret
```

#### Uso

```typescript
import { ResetPasswordTokenService } from '@modules/auth/services'

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
    private readonly emailService: EmailService,
  ) {}

  async execute(email: string) {
    const user = await this.findUserByEmail(email)

    // Generar token (UUID o JWT según configuración)
    const token = await this.resetPasswordTokenService.generateToken(user.id)

    // Construir URL de reset
    const resetUrl = `${process.env.FRONTEND_RESET_PASSWORD_URL}?token=${token}`

    // Enviar email
    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.username,
      resetLink: resetUrl,
      expiresInMinutes: 60,
    })

    return { message: 'Email de reset enviado' }
  }
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly resetPasswordTokenService: ResetPasswordTokenService,
  ) {}

  async execute(token: string, newPassword: string) {
    // Validar token
    const userId = await this.resetPasswordTokenService.validateToken(token)

    if (!userId) {
      throw new InvalidTokenException()
    }

    // Cambiar contraseña
    await this.updatePassword(userId, newPassword)

    // Revocar todos los tokens de reset del usuario
    await this.resetPasswordTokenService.revokeUserTokens(userId)

    return { message: 'Contraseña actualizada exitosamente' }
  }
}
```

#### Modo Redis vs JWT vs Both

```typescript
// Modo Redis (default)
RESET_PASSWORD_TOKEN_MODE=redis
// Token generado: "550e8400-e29b-41d4-a716-446655440000" (UUID)
// Almacenado en: auth:reset-pw:userId:tokenId
// Revocable: ✅ Sí

// Modo JWT
RESET_PASSWORD_TOKEN_MODE=jwt
// Token generado: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." (JWT firmado)
// Almacenado en: Ningún lado (stateless)
// Revocable: ❌ No (expira automáticamente)

// Modo Both (híbrido)
RESET_PASSWORD_TOKEN_MODE=both
// Token generado: JWT firmado
// Almacenado en: Redis (para validación y revocación)
// Revocable: ✅ Sí
```

---

### 4. TwoFactorTokenService

**Ubicación**: `src/modules/auth/services/two-factor-token.service.ts`

Gestiona códigos 2FA temporales (one-time use).

#### Configuración (ENV)

```bash
# Modo: 'redis' | 'jwt' | 'both'
TWO_FACTOR_TOKEN_MODE=redis
TWO_FACTOR_CODE_LENGTH=6
TWO_FACTOR_CODE_EXPIRES_IN=5m

# Solo requerido si mode es 'jwt' o 'both'
TWO_FACTOR_JWT_SECRET=your-secret
```

#### Uso

```typescript
import { TwoFactorTokenService } from '@modules/auth/services'

@Injectable()
export class Send2FACodeUseCase {
  constructor(
    private readonly twoFactorService: TwoFactorTokenService,
    private readonly emailService: EmailService,
  ) {}

  async execute(userId: string) {
    // Generar código (6 dígitos por defecto)
    const { code, token } = await this.twoFactorService.generateCode(userId)

    // code: "123456" (se envía al usuario)
    // token: puede ser igual al code (modo redis) o un JWT (modo jwt/both)

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.username,
      code,
      expiresInMinutes: 5,
    })

    return { message: 'Código 2FA enviado' }
  }
}

@Injectable()
export class Verify2FACodeUseCase {
  constructor(private readonly twoFactorService: TwoFactorTokenService) {}

  async execute(userId: string, code: string, token?: string) {
    // Validar código
    const isValid = await this.twoFactorService.validateCode(
      userId,
      code,
      token, // opcional, solo si se usa JWT
    )

    if (!isValid) {
      throw new InvalidCodeException()
    }

    // ⚠️ El código se revoca automáticamente al validar (one-time use)

    return { message: 'Código válido' }
  }
}
```

#### Características Especiales

- **One-time use**: Los códigos se revocan automáticamente al validarse
- **Códigos numéricos**: Genera códigos de N dígitos (configurable)
- **Múltiples códigos**: Un usuario puede tener varios códigos activos simultáneamente

---

## Configuración

### Variables de Entorno Completas

```bash
# ============================================
# JWT (Access/Refresh Tokens)
# ============================================
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-different-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# RESET PASSWORD TOKENS
# ============================================
RESET_PASSWORD_TOKEN_MODE=redis  # 'redis' | 'jwt' | 'both'
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h
RESET_PASSWORD_JWT_SECRET=your-reset-password-jwt-secret  # solo si mode es jwt/both

# ============================================
# TWO FACTOR AUTHENTICATION (2FA)
# ============================================
TWO_FACTOR_TOKEN_MODE=redis  # 'redis' | 'jwt' | 'both'
TWO_FACTOR_CODE_LENGTH=6
TWO_FACTOR_CODE_EXPIRES_IN=5m
TWO_FACTOR_JWT_SECRET=your-2fa-jwt-secret  # solo si mode es jwt/both

# ============================================
# REDIS (Requerido para modos redis y both)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Llaves de Redis

Las llaves se generan automáticamente usando `CACHE_KEYS` y `REDIS_PREFIXES`:

```typescript
// Refresh tokens
auth:refresh:userId:tokenId

// Blacklist
auth:blacklist:token

// Reset password
auth:reset-pw:userId:tokenId

// 2FA
auth:2fa:userId:code

// Email verification
auth:verify-email:userId:tokenId
```

---

## Ejemplos de Uso

### Ejemplo 1: Sistema de Reset Password Completo

```typescript
// 1. Usuario olvida su contraseña
@Post('forgot-password')
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  const token = await this.resetPasswordTokenService.generateToken(user.id)

  await this.emailService.sendResetPasswordEmail({
    to: user.email,
    resetLink: `${FRONTEND_URL}/reset-password?token=${token}`,
  })

  return { message: 'Email enviado' }
}

// 2. Usuario hace clic en el link y resetea su contraseña
@Post('reset-password')
async resetPassword(@Body() dto: ResetPasswordDto) {
  const userId = await this.resetPasswordTokenService.validateToken(dto.token)

  if (!userId) {
    throw new BadRequestException('Token inválido o expirado')
  }

  await this.updatePassword(userId, dto.newPassword)
  await this.resetPasswordTokenService.revokeUserTokens(userId)

  return { message: 'Contraseña actualizada' }
}
```

### Ejemplo 2: Login con 2FA

```typescript
// 1. Login inicial
@Post('login')
async login(@Body() dto: LoginDto) {
  const user = await this.validateCredentials(dto)

  if (user.has2FAEnabled) {
    // Generar código 2FA
    const { code } = await this.twoFactorService.generateCode(user.id)

    // Enviar código por email
    await this.emailService.sendTwoFactorCode({ to: user.email, code })

    return {
      requires2FA: true,
      message: 'Código 2FA enviado a tu email',
    }
  }

  // Login normal sin 2FA
  const tokens = await this.tokensService.generateTokenPair(user)
  return tokens
}

// 2. Verificar código 2FA
@Post('verify-2fa')
async verify2FA(@Body() dto: Verify2FADto) {
  const isValid = await this.twoFactorService.validateCode(
    dto.userId,
    dto.code,
  )

  if (!isValid) {
    throw new BadRequestException('Código inválido o expirado')
  }

  const user = await this.findUser(dto.userId)
  const tokens = await this.tokensService.generateTokenPair(user)

  return tokens
}
```

### Ejemplo 3: Cambio de Contraseña con Revocación de Sesiones

```typescript
@Post('change-password')
@UseGuards(JwtAuthGuard)
async changePassword(
  @GetUser() user: JwtPayload,
  @Body() dto: ChangePasswordDto,
) {
  // Validar contraseña actual
  await this.validateCurrentPassword(user.sub, dto.currentPassword)

  // Actualizar contraseña
  await this.updatePassword(user.sub, dto.newPassword)

  // Revocar todas las sesiones activas (refresh tokens)
  await this.tokensService.revokeAllUserTokens(user.sub)

  // Opcional: también revocar reset password tokens
  await this.resetPasswordTokenService.revokeUserTokens(user.sub)

  return {
    message: 'Contraseña actualizada. Por favor, inicia sesión nuevamente.',
  }
}
```

---

## Mejores Prácticas

### 1. Elección del Modo de Tokens

**Usa Redis (default)** cuando:
- Necesitas revocar tokens antes de su expiración
- La seguridad es crítica
- Tienes infraestructura Redis disponible

**Usa JWT** cuando:
- Necesitas tokens stateless (microservicios, serverless)
- No tienes Redis disponible
- No necesitas revocación inmediata

**Usa Both** cuando:
- Necesitas portabilidad de JWT + seguridad de Redis
- Tienes infraestructura híbrida
- Quieres migrar gradualmente de un modo a otro

### 2. Tiempos de Expiración Recomendados

```bash
# Access tokens: muy cortos (mitigar robo de tokens)
JWT_EXPIRES_IN=15m

# Refresh tokens: largos (buena UX)
JWT_REFRESH_EXPIRES_IN=7d

# Reset password: medio (balancear seguridad/UX)
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h

# 2FA: muy corto (seguridad crítica)
TWO_FACTOR_CODE_EXPIRES_IN=5m
```

### 3. Seguridad

- **Secrets diferentes**: Usa secrets distintos para cada tipo de token
- **HTTPS obligatorio**: Nunca envíes tokens por HTTP sin cifrar
- **HTTP-only cookies**: Almacena refresh tokens en cookies HTTP-only
- **Revocación**: Revoca tokens al cambiar contraseña o logout
- **Rate limiting**: Limita intentos de validación de 2FA

### 4. Manejo de Errores

```typescript
try {
  const userId = await this.resetPasswordTokenService.validateToken(token)
  if (!userId) {
    throw new BadRequestException('Token inválido')
  }
} catch (error) {
  // No revelar si el token es inválido o expirado
  throw new BadRequestException('Token inválido o expirado')
}
```

### 5. Logging y Auditoría

```typescript
// Registrar eventos importantes
await this.logger.info('Password reset requested', { userId, email })
await this.logger.warn('Failed 2FA attempt', { userId, attempts })
await this.logger.info('All sessions revoked', { userId, reason: 'password_change' })
```

---

## Testing

### Unit Tests

```typescript
describe('ResetPasswordTokenService', () => {
  it('should generate token in redis mode', async () => {
    const token = await service.generateToken(userId)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
  })

  it('should validate valid token', async () => {
    const token = await service.generateToken(userId)
    const result = await service.validateToken(token)
    expect(result).toBe(userId)
  })

  it('should return null for invalid token', async () => {
    const result = await service.validateToken('invalid-token')
    expect(result).toBeNull()
  })

  it('should revoke token', async () => {
    const token = await service.generateToken(userId)
    await service.revokeUserTokens(userId)
    const result = await service.validateToken(token)
    expect(result).toBeNull()
  })
})
```

---

## Migración desde Sistema Anterior

Si ya tienes un sistema de tokens, migra gradualmente:

1. **Instalar nuevos servicios** (ya hecho en este PR)
2. **Modo Both**: Configura `RESET_PASSWORD_TOKEN_MODE=both`
3. **Generar nuevos tokens**: Los nuevos tokens usan el nuevo sistema
4. **Validar ambos**: Valida tokens viejos y nuevos en paralelo
5. **Migrar completamente**: Una vez que no hay tokens viejos, cambia a modo `redis` o `jwt`

---

## Troubleshooting

### Redis no conecta
```
Error: Redis connection failed
```
**Solución**: Verifica que Redis esté corriendo y las credenciales sean correctas.

### Error: JWT_SECRET required
```
Error: RESET_PASSWORD_JWT_SECRET is required when using JWT mode
```
**Solución**: Agrega el secret correspondiente en `.env` o cambia el modo a `redis`.

### Token no valida
```
Token válido pero validateToken() devuelve null
```
**Solución en modo both**: Verifica que el token exista en Redis. Puede haber expirado o sido revocado.

---

## Referencias

- [NestJS JWT](https://docs.nestjs.com/security/authentication#jwt-token)
- [Redis Commands](https://redis.io/commands)
- [OWASP Token Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
