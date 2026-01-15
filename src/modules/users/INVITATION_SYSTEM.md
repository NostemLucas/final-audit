# Sistema de Invitaciones (Email Verification)

## Resumen

Sistema de invitaciones para usuarios creados por ADMIN. Usa **EmailVerificationService** (servicio de dominio) reutilizable desde múltiples use cases.

---

## Arquitectura

### Service (Servicio de Dominio)

**`EmailVerificationService`** - Responsable de:
- Generar tokens en Redis (TTL: 24h)
- Enviar emails de invitación
- Validar tokens
- Revocar tokens

### Use Cases

1. **`CreateUserUseCase`** - Admin crea usuario + envío automático
2. **`ResendInvitationUseCase`** - Admin re-envía invitación manualmente
3. **`VerifyEmailUseCase`** - Usuario verifica email con token

---

## Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. ADMIN CREA USUARIO                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              POST /users (solo ADMIN)
              {
                email: "user@example.com",
                names: "Juan",
                ...
              }
                            │
                            ▼
              ┌──────────────────────────────────┐
              │  CreateUserUseCase               │
              │  1. Valida datos                 │
              │  2. Crea usuario (INACTIVE)      │
              │  3. Llama a servicio ↓           │
              └──────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────────┐
              │  EmailVerificationService        │
              │  .generateAndSendInvitation()    │
              │  - Genera token UUID             │
              │  - Guarda en Redis (24h)         │
              │  - Envía email                   │
              └──────────────────────────────────┘
                            │
                            ▼
              📧 Email enviado a user@example.com
              Link: /verify-email?token=abc-123

┌─────────────────────────────────────────────────────────────┐
│  2. USUARIO VERIFICA EMAIL                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              GET /verify-email?token=abc-123
              (Frontend captura token)
                            │
                            ▼
              POST /auth/verify-email
              { token: "abc-123" }
                            │
                            ▼
              ┌──────────────────────────────────┐
              │  VerifyEmailUseCase              │
              │  1. Busca token en Redis         │
              │  2. Valida token                 │
              │  3. Marca emailVerified = true   │
              │  4. Cambia status = ACTIVE       │
              │  5. Revoca token                 │
              └──────────────────────────────────┘
                            │
                            ▼
              ✅ Usuario ACTIVO

┌─────────────────────────────────────────────────────────────┐
│  3. TOKEN EXPIRÓ → ADMIN RE-ENVÍA                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              Usuario contacta al admin:
              "No recibí el email" o "El link expiró"
                            │
                            ▼
              POST /users/:id/resend-invitation (solo ADMIN)
                            │
                            ▼
              ┌──────────────────────────────────┐
              │  ResendInvitationUseCase         │
              │  Llama a servicio ↓              │
              └──────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────────┐
              │  EmailVerificationService        │
              │  .generateAndSendInvitation()    │
              │  - Revoca tokens anteriores      │
              │  - Genera nuevo token            │
              │  - Envía email                   │
              └──────────────────────────────────┘
                            │
                            ▼
              📧 Nuevo email enviado
```

---

## Componentes

### 1. EmailVerificationService

**Ubicación:** `src/modules/users/services/email-verification.service.ts`

**Métodos principales:**

```typescript
// Generar token y enviar invitación
await emailVerificationService.generateAndSendInvitation(userId)
// Returns: { tokenId: string, email: string }

// Validar token
await emailVerificationService.validateToken(userId, tokenId)
// Returns: boolean

// Buscar token sin conocer userId
await emailVerificationService.findTokenByTokenId(tokenId)
// Returns: { tokenId, userId, createdAt } | null

// Revocar token específico
await emailVerificationService.revokeToken(userId, tokenId)

// Revocar todos los tokens de un usuario
await emailVerificationService.revokeAllUserTokens(userId)
// Returns: número de tokens revocados
```

**Características:**
- ✅ TTL de 24 horas automático
- ✅ Revoca tokens anteriores antes de generar uno nuevo
- ✅ Construye link con `FRONTEND_URL` del .env
- ✅ Maneja errores de email sin fallar

---

### 2. CreateUserUseCase

**Flujo:**
1. Admin crea usuario → Usuario se crea con `status = INACTIVE`
2. Sistema envía invitación **automáticamente**
3. Si falla el envío de email → se loggea pero no falla la creación
4. Admin puede re-enviar manualmente después

**Código:**
```typescript
@Post('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async createUser(@Body() dto: CreateUserDto) {
  const user = await this.createUserUseCase.execute(dto)

  return {
    message: 'Usuario creado. Email de invitación enviado.',
    user,
  }
}
```

---

### 3. ResendInvitationUseCase

**SOLO para ADMIN.**

**Cuándo usar:**
- Token expiró (> 24h)
- Usuario no recibió email
- Usuario eliminó email

**Código:**
```typescript
@Post('users/:id/resend-invitation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async resendInvitation(@Param('id') userId: string) {
  const result = await this.resendInvitationUseCase.execute(userId)

  return result
  // Returns: { tokenId, email, message }
}
```

**Validaciones automáticas:**
- ✅ Usuario existe
- ✅ Email no está verificado
- ✅ Revoca tokens anteriores

---

### 4. VerifyEmailUseCase

**Público (sin autenticación).**

**Flujo:**
1. Usuario hace clic en link del email
2. Frontend captura token de query param
3. Frontend llama a este endpoint
4. Usuario se activa automáticamente

**Código:**
```typescript
@Post('auth/verify-email')
async verifyEmail(@Body() dto: VerifyEmailDto) {
  const user = await this.verifyEmailUseCase.execute(dto.token)

  return {
    message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
    user: {
      id: user.id,
      email: user.email,
      status: user.status, // ACTIVE
    },
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

## Configuración Necesaria

### Variables de Entorno

```bash
# Frontend URL (para construir links de verificación)
FRONTEND_URL=http://localhost:3000

# Redis (ya configurado en CacheModule)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (ya configurado en EmailModule)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
```

### Módulos Importados

Asegúrate que `UsersModule` importe:

```typescript
@Module({
  imports: [
    CacheModule,      // TokenStorageService
    EmailModule,      // EmailService
    ConfigModule,     // Variables de entorno
  ],
})
export class UsersModule {}
```

---

## Datos en Redis

**Estructura de llave:**
```
auth:verify-email:{userId}:{tokenId}
```

**Ejemplo:**
```
auth:verify-email:550e8400-e29b-41d4-a716-446655440000:abc-123-def-456
```

**Valor (JSON):**
```json
{
  "tokenId": "abc-123-def-456",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1704067200000
}
```

**TTL:** 86400 segundos (24 horas)

---

## Diferencia: Use Case vs Service

### ¿Por qué EmailVerificationService es un servicio?

| Criterio | Use Case | Service (Dominio) |
|----------|----------|-------------------|
| Propósito | Orquesta una operación completa de negocio | Proporciona funcionalidad reutilizable |
| Responsabilidad | Ejecuta un flujo específico iniciado por un actor | Encapsula lógica de dominio compartida |
| Dependencias | Llama a servicios y repositorios | Implementa lógica técnica/de negocio |
| Reutilizable | No (1 use case = 1 operación) | Sí (usado por múltiples use cases) |

**En nuestro caso:**

- ❌ `SendVerificationEmailUseCase` → Era redundante
- ✅ `EmailVerificationService` → Reutilizable desde:
  - `CreateUserUseCase` (automático)
  - `ResendInvitationUseCase` (manual admin)
  - `VerifyEmailUseCase` (validación)

---

## Ejemplo Completo de Integración

### Controller

```typescript
// users.controller.ts
import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common'
import { Roles, RolesGuard, JwtAuthGuard } from '@modules/auth'
import { Role } from '../entities/user.entity'
import {
  CreateUserUseCase,
  ResendInvitationUseCase,
  VerifyEmailUseCase,
} from '../use-cases'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly resendInvitationUseCase: ResendInvitationUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  // 1. Crear usuario (solo ADMIN) → Envío automático
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto)

    return {
      message: 'Usuario creado exitosamente. Email de invitación enviado.',
      user,
    }
  }

  // 2. Re-enviar invitación (solo ADMIN)
  @Post(':id/resend-invitation')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async resendInvitation(@Param('id') userId: string) {
    return await this.resendInvitationUseCase.execute(userId)
  }
}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly verifyEmailUseCase: VerifyEmailUseCase) {}

  // 3. Verificar email (público)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const user = await this.verifyEmailUseCase.execute(dto.token)

    return {
      message: 'Email verificado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    }
  }
}
```

---

## Testing

### Test del Servicio

```typescript
describe('EmailVerificationService', () => {
  it('debe generar token y enviar email', async () => {
    const userId = 'user-123'

    const result = await emailVerificationService.generateAndSendInvitation(userId)

    expect(result.tokenId).toBeDefined()
    expect(result.email).toBe('user@example.com')
    expect(emailService.sendVerificationEmail).toHaveBeenCalled()
  })

  it('debe revocar tokens anteriores al generar uno nuevo', async () => {
    const userId = 'user-123'

    // Generar primer token
    await emailVerificationService.generateAndSendInvitation(userId)

    // Generar segundo token (debe revocar el primero)
    await emailVerificationService.generateAndSendInvitation(userId)

    const tokens = await tokenStorage.listUserTokens(userId, REDIS_PREFIXES.EMAIL_VERIFICATION)
    expect(tokens).toHaveLength(1) // Solo el último
  })
})
```

### Test del Use Case

```typescript
describe('VerifyEmailUseCase', () => {
  it('debe verificar email y activar usuario', async () => {
    // Arrange
    const userId = 'user-123'
    const { tokenId } = await emailVerificationService.generateAndSendInvitation(userId)

    // Act
    const user = await verifyEmailUseCase.execute(tokenId)

    // Assert
    expect(user.emailVerified).toBe(true)
    expect(user.status).toBe(UserStatus.ACTIVE)
    expect(user.emailVerifiedAt).toBeDefined()

    // Token debe estar revocado
    const isValid = await emailVerificationService.validateToken(userId, tokenId)
    expect(isValid).toBe(false)
  })
})
```

---

## Mejoras Futuras

### 1. Mapping Inverso Token → User

Actualmente `findTokenByTokenId()` hace un `KEYS` scan (costoso en producción).

**Solución:**
```typescript
// Al crear token
await redis.set(`token-map:${tokenId}`, userId, 'EX', 86400)

// Al buscar
const userId = await redis.get(`token-map:${tokenId}`)
```

### 2. Rate Limiting para Re-envíos

Prevenir spam de re-envíos:
```typescript
// Máximo 3 re-envíos por hora por usuario
const key = `rate-limit:resend:${userId}`
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, 3600)
if (count > 3) throw new TooManyRequestsException('Máximo 3 re-envíos por hora')
```

### 3. Notificación cuando Usuario se Activa

Enviar email al admin cuando un usuario verifica su cuenta:
```typescript
await emailService.sendCustomEmail(
  adminEmail,
  'Usuario Verificado',
  'user-activated',
  { userName: user.fullName, userEmail: user.email }
)
```

---

## Troubleshooting

### Usuario no recibe email

**Verificar:**
1. Credenciales de email correctas en `.env`
2. Template `verify-email.hbs` existe
3. Logs de `CreateUserUseCase` - ¿Hay error al enviar?

**Solución temporal:** Admin puede re-enviar con endpoint de re-envío

### Token inválido o expirado

**Causas:**
1. TTL de 24h expiró
2. Token ya fue usado (one-time use)
3. Redis se reinició y perdió datos

**Solución:** Admin re-envía invitación con `ResendInvitationUseCase`

### Email verificado pero status sigue INACTIVE

**Causa:** Error en `VerifyEmailUseCase` al guardar cambios

**Debug:**
```typescript
// Verificar en logs si se guardó
const user = await usersRepository.findById(userId)
console.log({ emailVerified: user.emailVerified, status: user.status })
```

---

## Resumen de Archivos

### ✅ Creados

```
src/modules/users/
├── services/
│   ├── email-verification.service.ts ✨ NUEVO (servicio de dominio)
│   └── index.ts
├── use-cases/
│   └── resend-invitation/
│       ├── resend-invitation.use-case.ts ✨ NUEVO
│       └── index.ts
└── INVITATION_SYSTEM.md ✨ NUEVA (esta guía)
```

### 🔄 Modificados

```
src/modules/users/
├── use-cases/
│   ├── create-user/create-user.use-case.ts  (usa servicio)
│   ├── verify-email/verify-email.use-case.ts (usa servicio)
│   └── index.ts  (actualizado exports)
└── users.module.ts  (agregado EmailVerificationService y ResendInvitationUseCase)
```

### ❌ Eliminados

```
src/modules/users/use-cases/send-verification-email/  (redundante, reemplazado por servicio)
```

---

## Ventajas de esta Arquitectura

1. ✅ **Reutilización:** Un solo servicio usado por 3 use cases
2. ✅ **Separation of Concerns:** Lógica de tokens separada de casos de uso
3. ✅ **Testeable:** Servicio fácil de mockear en tests
4. ✅ **Mantenible:** Cambios en lógica de tokens solo afectan 1 archivo
5. ✅ **Sin Rate Limit:** Solo admin puede crear/re-enviar (controlado)
6. ✅ **Flexible:** Fácil agregar nuevos métodos al servicio

---

¡Sistema listo para usar! 🎉
