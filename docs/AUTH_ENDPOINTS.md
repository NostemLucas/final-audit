# Authentication Endpoints Documentation

Este documento describe todos los endpoints de autenticación disponibles en el sistema.

## Tabla de Contenidos

- [Autenticación Básica](#autenticación-básica)
- [Reset Password](#reset-password)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)

---

## Autenticación Básica

### POST /auth/login

Autentica un usuario con username/email y password.

**Request Body:**
```json
{
  "usernameOrEmail": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["ADMIN"]
  }
}
```

**Cookies:**
- `refreshToken` (HTTP-only, 7 días)

---

### POST /auth/refresh

Renueva el access token usando el refresh token de la cookie.
Implementa token rotation: el refresh token viejo se revoca y se genera uno nuevo.

**Cookies Required:**
- `refreshToken`

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies Updated:**
- `refreshToken` (nuevo token)

---

### POST /auth/logout

Cierra la sesión del usuario:
- Blacklist del access token (revocación inmediata)
- Revocación del refresh token en Redis
- Limpieza de la cookie

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Cookies Required:**
- `refreshToken`

**Response:** `204 No Content`

---

## Reset Password

### POST /auth/password/request-reset

Solicita un reset de contraseña. Genera un token y envía email con link de reset.

**Request Body:**
```json
{
  "email": "usuario@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Si el email existe, recibirás un link para resetear tu contraseña"
}
```

**Notas de Seguridad:**
- Por motivos de seguridad, la respuesta es la misma si el email existe o no
- Esto previene enumeration attacks (descubrir qué emails existen en el sistema)
- El token expira en 1 hora
- El link se envía a: `${FRONTEND_URL}/reset-password?token=<jwt_token>`

---

### POST /auth/password/reset

Resetea la contraseña usando el token del email.
Revoca el token y cierra todas las sesiones del usuario por seguridad.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass123!"
}
```

**Validaciones de Contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (@$!%*?&#.)

**Response:** `200 OK`
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores Posibles:**
- `400 Bad Request` - Token inválido o expirado
- `404 Not Found` - Usuario no encontrado

**Efectos Secundarios:**
- El token de reset se revoca (un solo uso)
- Todos los refresh tokens del usuario se revocan (cierra todas las sesiones)
- Esto obliga al usuario a hacer login nuevamente en todos los dispositivos

---

## Two-Factor Authentication (2FA)

### POST /auth/2fa/generate

Genera un código 2FA numérico de 6 dígitos y lo envía por email.
Devuelve un token JWT para validación posterior.

**Request Body:**
```json
{
  "identifier": "usuario@example.com"
}
```

**Nota:** El `identifier` puede ser email o userId.

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Código 2FA enviado al email registrado"
}
```

**Características:**
- Código válido por 5 minutos
- El código es numérico de 6 dígitos (ej: "123456")
- Se puede solicitar un nuevo código con `/auth/2fa/resend`
- El token JWT contiene el código encriptado para validación adicional

---

### POST /auth/2fa/verify

Verifica un código 2FA.
El código se elimina de Redis después del primer uso (one-time use).

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Nota:** El campo `token` es opcional pero recomendado para mayor seguridad.

**Response:** `200 OK`
```json
{
  "valid": true,
  "message": "Código verificado exitosamente"
}
```

**Response (código inválido):** `200 OK`
```json
{
  "valid": false,
  "message": "Código inválido o expirado"
}
```

**Validaciones:**
- Código debe tener exactamente 6 dígitos
- Código debe ser numérico
- Código debe estar en Redis (no revocado, no expirado)
- Si se proporciona token JWT, también se valida
- Después de validar, el código se elimina (un solo uso)

---

### POST /auth/2fa/resend

Reenvía un código 2FA.
Revoca el código anterior y genera uno nuevo.

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Nuevo código 2FA enviado"
}
```

**Efectos:**
- Todos los códigos 2FA anteriores del usuario se revocan
- Se genera un nuevo código y se envía por email
- El nuevo código también expira en 5 minutos

---

## Variables de Entorno Requeridas

Para que estos endpoints funcionen, debes configurar las siguientes variables en tu `.env`:

```bash
# JWT Secrets
RESET_PASSWORD_JWT_SECRET=your-reset-password-secret-here
TWO_FACTOR_JWT_SECRET=your-2fa-secret-here

# JWT Expiration
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h
TWO_FACTOR_CODE_EXPIRES_IN=5m
TWO_FACTOR_CODE_LENGTH=6

# Frontend URL (para links de reset)
FRONTEND_URL=http://localhost:3000

# Email Configuration (ver CLAUDE.md para detalles)
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_USER=your-email@ethereal.email
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@audit-core.com
```

---

## Flujos de Usuario Completos

### Flujo de Reset Password

1. **Usuario olvida su contraseña**
   - Usuario va a "Olvidé mi contraseña"
   - Ingresa su email
   - Frontend: `POST /auth/password/request-reset`

2. **Sistema envía email**
   - Backend genera token (JWT + Redis)
   - Backend envía email con link: `${FRONTEND_URL}/reset-password?token=<jwt>`
   - Token expira en 1 hora

3. **Usuario recibe email y hace clic**
   - Frontend extrae token de la URL
   - Usuario ingresa nueva contraseña
   - Frontend: `POST /auth/password/reset` con token y nueva contraseña

4. **Sistema actualiza contraseña**
   - Backend valida token
   - Backend actualiza contraseña (bcrypt hash)
   - Backend revoca token y todas las sesiones
   - Usuario debe hacer login nuevamente

### Flujo de 2FA

1. **Generación de código**
   - Usuario intenta acción sensible (ej: cambiar email)
   - Frontend: `POST /auth/2fa/generate` con email/userId
   - Backend envía código por email
   - Frontend guarda el token JWT

2. **Verificación**
   - Usuario recibe código por email (ej: "123456")
   - Usuario ingresa código en el frontend
   - Frontend: `POST /auth/2fa/verify` con userId, código y token
   - Backend valida y elimina código (un solo uso)

3. **Reenvío (opcional)**
   - Si el código expira o el usuario no lo recibió
   - Frontend: `POST /auth/2fa/resend` con userId
   - Backend revoca código anterior y envía uno nuevo

---

## Ejemplos con cURL

### Solicitar Reset Password
```bash
curl -X POST http://localhost:3001/auth/password/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@example.com"}'
```

### Resetear Password
```bash
curl -X POST http://localhost:3001/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "newPassword": "NewSecurePass123!"
  }'
```

### Generar Código 2FA
```bash
curl -X POST http://localhost:3001/auth/2fa/generate \
  -H "Content-Type: application/json" \
  -d '{"identifier": "usuario@example.com"}'
```

### Verificar Código 2FA
```bash
curl -X POST http://localhost:3001/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "123456",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Swagger Documentation

Todos estos endpoints están documentados en Swagger.
Accede a la documentación interactiva en:

```
http://localhost:3001/api
```

Desde ahí puedes probar todos los endpoints directamente desde el navegador.
