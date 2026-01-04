# Ejemplo de Integración: Email con Sistema de Autenticación

Este documento muestra cómo integrar el sistema de emails con el flujo de autenticación existente.

## 1. Configurar Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Para desarrollo - Usa Ethereal (gratis)
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-usuario@ethereal.email
MAIL_PASSWORD=tu-password-ethereal
MAIL_FROM=noreply@audit2.com
MAIL_FROM_NAME=Audit2
APP_NAME=Audit2

FRONTEND_URL=http://localhost:3000
```

**Obtener credenciales Ethereal:**

1. Ve a https://ethereal.email/create
2. Copia el usuario y contraseña
3. Pégalos en tu `.env`
4. Los emails aparecerán en https://ethereal.email/messages

## 2. Modificar AuthService para Enviar Emails

### Archivo: `src/core/auth/services/auth.service.ts`

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EmailService } from '@shared/email'
import { UserRepository } from '../../users/infrastructure/user.repository'
import { OtpRepository } from '../infrastructure/otp.repository'
import * as crypto from 'crypto'

@Injectable()
export class AuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía código de 2FA por email
   */
  async sendTwoFactorCode(userId: string): Promise<void> {
    // 1. Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 2. Guardar en BD
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    await this.otpRepository.create({
      userId,
      code,
      type: 'TWO_FACTOR',
      expiresAt,
    })

    // 3. Obtener usuario
    const user = await this.userRepository.findByIdOrFail(userId)

    // 4. Enviar email
    await this.emailService.sendTwoFactorCode({
      to: user.email,
      userName: user.fullName,
      code,
      expiresInMinutes: 10,
    })
  }

  /**
   * Inicia el proceso de recuperación de contraseña
   */
  async forgotPassword(email: string): Promise<void> {
    // 1. Buscar usuario
    const user = await this.userRepository.findByEmail(email)

    // Por seguridad, no revelar si el email existe
    if (!user) {
      return
    }

    // 2. Generar token único
    const resetToken = crypto.randomBytes(32).toString('hex')

    // 3. Guardar token en BD
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
    await this.otpRepository.create({
      userId: user.id,
      code: resetToken,
      type: 'PASSWORD_RESET',
      expiresAt,
    })

    // 4. Crear link de reset
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

    // 5. Enviar email
    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.fullName,
      resetLink,
      expiresInMinutes: 30,
    })
  }

  /**
   * Verifica el token de reset y cambia la contraseña
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1. Buscar token en BD
    const otp = await this.otpRepository.findByCodeAndType(
      token,
      'PASSWORD_RESET',
    )

    if (!otp || otp.isExpired() || otp.isUsed) {
      throw new UnauthorizedException('Token inválido o expirado')
    }

    // 2. Obtener usuario
    const user = await this.userRepository.findByIdOrFail(otp.userId)

    // 3. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 4. Actualizar contraseña
    user.updatePassword(hashedPassword)
    await this.userRepository.save(user)

    // 5. Marcar token como usado
    otp.markAsUsed()
    await this.otpRepository.save(otp)

    // OPCIONAL: Enviar email de confirmación
    await this.emailService.sendCustomEmail(
      user.email,
      'Contraseña actualizada',
      'password-changed', // Crear este template si quieres
      {
        userName: user.fullName,
      },
    )
  }
}
```

## 3. Actualizar AuthModule

### Archivo: `src/core/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { EmailModule } from '@shared/email' // IMPORTANTE: Importar

@Module({
  imports: [
    // ... otros imports
    EmailModule, // AGREGAR ESTO
  ],
  // ... resto del módulo
})
export class AuthModule {}
```

## 4. Crear Endpoints en AuthController

### Archivo: `src/core/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common'
import { Public } from './decorators/public.decorator'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ApiUnauthorizedResponse } from '@shared/swagger'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Solicitar código de 2FA
   */
  @Post('send-2fa-code')
  @ApiOperation({ summary: 'Enviar código de autenticación de dos factores' })
  @ApiResponse({ status: 200, description: 'Código enviado exitosamente' })
  @ApiUnauthorizedResponse()
  async sendTwoFactorCode(@CurrentUser() user: User) {
    await this.authService.sendTwoFactorCode(user.id)
    return {
      message: 'Código de verificación enviado a tu email',
    }
  }

  /**
   * Solicitar recuperación de contraseña
   */
  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiResponse({ status: 200, description: 'Email de recuperación enviado' })
  async forgotPassword(@Body() dto: { email: string }) {
    await this.authService.forgotPassword(dto.email)

    // Siempre retorna success por seguridad
    return {
      message:
        'Si el email existe, recibirás instrucciones para recuperar tu contraseña',
    }
  }

  /**
   * Resetear contraseña con token
   */
  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
  })
  @ApiUnauthorizedResponse()
  async resetPassword(@Body() dto: { token: string; newPassword: string }) {
    await this.authService.resetPassword(dto.token, dto.newPassword)
    return {
      message: 'Contraseña restablecida exitosamente',
    }
  }
}
```

## 5. Actualizar OTP Entity (si es necesario)

### Archivo: `src/core/auth/domain/otp.entity.ts`

```typescript
export class Otp {
  // ... campos existentes

  /**
   * Verifica si el OTP está expirado
   */
  isExpired(): boolean {
    return this.expiresAt < new Date()
  }

  /**
   * Marca el OTP como usado
   */
  markAsUsed(): void {
    this.isUsed = true
    this.usedAt = new Date()
  }
}
```

## 6. Crear DTOs

### Archivo: `src/core/auth/dto/forgot-password.dto.ts`

```typescript
import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string
}
```

### Archivo: `src/core/auth/dto/reset-password.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string
}
```

## 7. Flujo Completo de Recuperación de Contraseña

### Frontend → Backend

1. **Usuario olvida su contraseña**

   ```typescript
   POST /auth/forgot-password
   Body: { "email": "user@example.com" }
   ```

2. **Backend envía email con link**
   - Genera token único
   - Guarda en BD con expiración de 30 min
   - Envía email con link: `https://app.com/reset-password?token=abc123`

3. **Usuario hace click en el link**
   - Frontend muestra formulario de nueva contraseña
   - Usuario ingresa nueva contraseña

4. **Frontend envía nueva contraseña**

   ```typescript
   POST /auth/reset-password
   Body: {
     "token": "abc123",
     "newPassword": "NuevaPassword123!"
   }
   ```

5. **Backend valida y actualiza**
   - Verifica token no expirado
   - Verifica token no usado
   - Actualiza contraseña
   - Marca token como usado
   - (Opcional) Envía email de confirmación

## 8. Flujo de 2FA

### Durante Login

1. **Usuario inicia sesión**

   ```typescript
   POST /auth/login
   Body: { "username": "john", "password": "pass123" }
   ```

2. **Backend detecta 2FA habilitado**
   - Genera código de 6 dígitos
   - Guarda en BD con expiración de 10 min
   - Envía email con código
   - Retorna: `{ "requires2FA": true, "userId": "123" }`

3. **Frontend muestra formulario de 2FA**
   - Usuario recibe email con código
   - Ingresa código en formulario

4. **Frontend envía código**

   ```typescript
   POST /auth/verify-2fa
   Body: { "userId": "123", "code": "123456" }
   ```

5. **Backend verifica y autentica**
   - Verifica código
   - Marca código como usado
   - Genera tokens JWT
   - Retorna tokens de acceso

## 9. Testing Manual

### Probar Email de 2FA

```bash
curl -X POST http://localhost:3000/auth/send-2fa-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Ve a https://ethereal.email/messages para ver el email.

### Probar Recuperación de Contraseña

```bash
# Solicitar reset
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Resetear contraseña
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"NewPass123!"}'
```

## 10. Verificar en Logs

El sistema registrará:

```
[EmailService] Email enviado exitosamente a user@example.com: Código de verificación - Audit2
[EmailService] Email enviado exitosamente a user@example.com: Recuperar contraseña - Audit2
```

## 🎉 ¡Listo!

Ahora tienes un sistema completo de emails integrado con tu autenticación. Los usuarios pueden:

- ✅ Recibir códigos de 2FA por email
- ✅ Recuperar su contraseña
- ✅ Recibir emails de bienvenida
- ✅ Verificar su cuenta por email
