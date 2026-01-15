# Guía de Verificación de Email

## Resumen

Sistema completo de verificación de email usando **Redis (TokenStorageService)** para almacenar tokens temporales con TTL de 24 horas.

## Use Cases Implementados

### 1. `SendVerificationEmailUseCase`

**Responsabilidad:** Generar token y enviar email de verificación.

**Cuándo usar:**
- Al crear un nuevo usuario (registro)
- Cuando el usuario solicita re-enviar el email
- Cuando un token expiró

**Métodos:**

```typescript
// Por userId
await sendVerificationEmailUseCase.execute(userId)
// Returns: { tokenId: string, email: string }

// Por email (útil cuando no se conoce el userId)
await sendVerificationEmailUseCase.executeByEmail('user@example.com')
// Returns: { email: string }
```

**Validaciones:**
- ✅ Usuario existe
- ✅ Email aún no está verificado
- ✅ Revoca tokens anteriores automáticamente

**Flujo:**
1. Busca el usuario por ID o email
2. Valida que el email no esté verificado
3. Revoca tokens anteriores del usuario
4. Genera nuevo token UUID y lo almacena en Redis
5. Envía email con link: `{FRONTEND_URL}/verify-email?token={tokenId}`

---

### 2. `VerifyEmailUseCase`

**Responsabilidad:** Validar token y activar usuario.

**Cuándo usar:**
- Cuando el usuario hace clic en el link del email
- Endpoint: `POST /auth/verify-email` (recomendado)

**Método:**

```typescript
await verifyEmailUseCase.execute(tokenId)
// Returns: UserEntity (verificado y activado)
```

**Validaciones:**
- ✅ Token existe en Redis
- ✅ Usuario existe
- ✅ One-time use (token se revoca después de usar)

**Flujo:**
1. Busca el token en Redis
2. Extrae el userId del token
3. Busca el usuario
4. Si ya está verificado, solo revoca el token y retorna
5. Si no está verificado:
   - Marca `emailVerified = true`
   - Establece `emailVerifiedAt = now()`
   - Cambia `status = ACTIVE`
   - Revoca el token (one-time use)
   - Guarda el usuario

**Excepciones:**

```typescript
// Token expirado o inválido
throw new BadRequestException('Token de verificación inválido o expirado...')

// Usuario no encontrado
throw new NotFoundException('Usuario no encontrado')
```

---

## Integración en Controladores

### Ejemplo 1: Endpoint de Verificación

```typescript
// auth.controller.ts o users.controller.ts
@Post('verify-email')
async verifyEmail(@Body() dto: VerifyEmailDto) {
  try {
    const user = await this.verifyEmailUseCase.execute(dto.token)
    return {
      message: 'Email verificado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      // Token expirado - ofrecer re-envío
      throw new BadRequestException({
        message: error.message,
        action: 'RESEND_EMAIL',
      })
    }
    throw error
  }
}
```

**DTO:**
```typescript
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string
}
```

---

### Ejemplo 2: Endpoint de Re-envío

```typescript
@Post('resend-verification-email')
@HttpCode(200)
async resendVerificationEmail(@Body() dto: ResendVerificationEmailDto) {
  const result = await this.sendVerificationEmailUseCase.executeByEmail(dto.email)

  return {
    message: 'Email de verificación enviado exitosamente',
    email: result.email,
  }
}
```

**DTO:**
```typescript
export class ResendVerificationEmailDto {
  @IsEmail()
  email: string
}
```

---

### Ejemplo 3: Enviar en Registro

```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  // 1. Crear usuario
  const user = await this.createUserUseCase.execute(dto)

  // 2. Enviar email de verificación automáticamente
  await this.sendVerificationEmailUseCase.execute(user.id)

  return {
    message: 'Usuario registrado. Por favor, verifica tu email.',
    user: {
      id: user.id,
      email: user.email,
      emailVerified: false,
    },
  }
}
```

---

## Flujo Completo (Diagrama)

```
┌─────────────────────────────────────────────────────────────────┐
│                      1. REGISTRO DE USUARIO                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    POST /auth/register
                    { email, password, ... }
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  CreateUserUseCase      │
                    │  status: INACTIVE       │
                    │  emailVerified: false   │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────────┐
                    │  SendVerificationEmailUseCase       │
                    │  1. Genera token UUID               │
                    │  2. Guarda en Redis (TTL: 24h)      │
                    │  3. Envía email con link            │
                    └─────────────────────────────────────┘
                                  │
                                  ▼
                    Email enviado a: user@example.com
                    Link: /verify-email?token=abc-123-def

┌─────────────────────────────────────────────────────────────────┐
│                  2. USUARIO HACE CLIC EN LINK                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    GET /verify-email?token=abc-123-def
                    (Frontend captura token)
                                  │
                                  ▼
                    POST /auth/verify-email
                    { token: "abc-123-def" }
                                  │
                                  ▼
                    ┌─────────────────────────────────────┐
                    │  VerifyEmailUseCase                 │
                    │  1. Valida token en Redis           │
                    │  2. Marca emailVerified = true      │
                    │  3. Cambia status = ACTIVE          │
                    │  4. Revoca token (one-time use)     │
                    └─────────────────────────────────────┘
                                  │
                                  ▼
                    ✅ Usuario activo y verificado

┌─────────────────────────────────────────────────────────────────┐
│                3. CASO: TOKEN EXPIRADO (> 24h)                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    POST /auth/verify-email
                    { token: "expired-token" }
                                  │
                                  ▼
                    ❌ BadRequestException
                    "Token inválido o expirado"
                                  │
                                  ▼
                    Frontend muestra opción:
                    "¿Reenviar email de verificación?"
                                  │
                                  ▼
                    POST /auth/resend-verification-email
                    { email: "user@example.com" }
                                  │
                                  ▼
                    SendVerificationEmailUseCase
                    (genera nuevo token y envía email)
```

---

## Configuración Requerida

### Variables de Entorno

```bash
# Frontend URL (para construir links)
FRONTEND_URL=http://localhost:3000

# Redis (usado por TokenStorageService)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (usado por EmailService)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@yourapp.com
```

### Módulos Requeridos

Asegúrate de importar estos módulos en tu `AppModule` o `UsersModule`:

```typescript
@Module({
  imports: [
    CacheModule,      // Proporciona TokenStorageService y Redis
    EmailModule,      // Proporciona EmailService
    ConfigModule,     // Para leer variables de entorno
  ],
})
```

---

## Estructura de Datos en Redis

**Llave:**
```
auth:verify-email:{userId}:{tokenId}
```

**Valor (JSON):**
```json
{
  "tokenId": "abc-123-def-456",
  "userId": "user-uuid",
  "createdAt": 1704067200000
}
```

**TTL:** 24 horas (86400 segundos)

**Ejemplos de llaves:**
```
auth:verify-email:550e8400-e29b-41d4-a716-446655440000:abc-123-def
```

---

## Testing

### Test de Verificación Exitosa

```typescript
describe('VerifyEmailUseCase', () => {
  it('debe verificar email y activar usuario', async () => {
    // Arrange
    const userId = 'user-123'
    const tokenId = 'token-456'

    // Generar token
    await sendVerificationEmailUseCase.execute(userId)

    // Act
    const user = await verifyEmailUseCase.execute(tokenId)

    // Assert
    expect(user.emailVerified).toBe(true)
    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.emailVerifiedAt).toBeDefined()
  })
})
```

### Test de Token Expirado

```typescript
it('debe lanzar error si token expiró', async () => {
  const expiredToken = 'expired-token'

  await expect(
    verifyEmailUseCase.execute(expiredToken)
  ).rejects.toThrow(BadRequestException)
})
```

### Test de Re-envío

```typescript
it('debe re-enviar email cuando se solicita', async () => {
  const email = 'user@example.com'

  const result = await sendVerificationEmailUseCase.executeByEmail(email)

  expect(result.email).toBe(email)
  expect(emailService.sendVerificationEmail).toHaveBeenCalled()
})
```

---

## Mejoras Futuras

### 1. Optimización de Búsqueda de Token

Actualmente, `VerifyEmailUseCase` usa un `KEYS` pattern para buscar el token, lo cual no es ideal en producción.

**Solución:** Crear un mapping inverso en Redis:

```typescript
// Al crear token
await redis.set(`token-to-user:${tokenId}`, userId, 'EX', ttl)

// Al buscar
const userId = await redis.get(`token-to-user:${tokenId}`)
```

### 2. Rate Limiting

Limitar re-envíos de email para prevenir spam:

```typescript
// Máximo 3 re-envíos por hora
const key = `rate-limit:verify-email:${email}`
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, 3600)
if (count > 3) throw new TooManyRequestsException()
```

### 3. Notificación de Verificación

Enviar email de confirmación cuando el usuario verifica su cuenta:

```typescript
await emailService.sendWelcomeEmail({
  to: user.email,
  userName: user.fullName,
  loginLink: `${frontendUrl}/login`,
})
```

---

## Problemas Comunes

### Error: "CacheModule is not imported"

**Solución:** Importa `CacheModule` en `UsersModule` o `AuthModule`:

```typescript
@Module({
  imports: [CacheModule],
  // ...
})
```

### Error: "Email not sent"

**Verificar:**
1. Variables de entorno de email configuradas
2. Credenciales correctas (usa Ethereal Email para testing)
3. Template `verify-email.hbs` existe en `src/@core/email/templates/`

### Token no se encuentra en Redis

**Posibles causas:**
1. TTL expiró (24 horas)
2. Token fue revocado después de usar
3. Redis no está corriendo
4. Conexión a Redis falló

**Debug:**
```bash
# Conectar a Redis CLI
redis-cli

# Ver todas las llaves de verificación
KEYS auth:verify-email:*

# Ver un token específico
GET auth:verify-email:{userId}:{tokenId}
```

---

## Resumen de Cambios Realizados

### ✅ Archivos Creados

1. `send-verification-email/send-verification-email.use-case.ts` - Nuevo use case
2. `send-verification-email/index.ts` - Export del use case
3. `EMAIL_VERIFICATION_GUIDE.md` - Esta guía

### ✅ Archivos Modificados

1. `verify-email/verify-email.use-case.ts` - Refactorizado para usar TokenStorageService
2. `use-cases/index.ts` - Agregado export de SendVerificationEmailUseCase
3. `users.module.ts` - Agregado SendVerificationEmailUseCase a providers

### ✅ Dependencias Utilizadas

- `@core/cache` - TokenStorageService, REDIS_PREFIXES
- `@core/email` - EmailService, VerifyEmailData
- `@core/database` - @Transactional decorator
- `@nestjs/config` - ConfigService para FRONTEND_URL

---

## Próximos Pasos Recomendados

1. **Crear endpoints en el controller:**
   - `POST /auth/verify-email`
   - `POST /auth/resend-verification-email`

2. **Agregar rate limiting** para prevenir abuso

3. **Crear tests unitarios** para ambos use cases

4. **Optimizar búsqueda de token** con mapping inverso

5. **Agregar logging** de eventos de verificación para auditoría

6. **Frontend:** Crear páginas de verificación y re-envío
