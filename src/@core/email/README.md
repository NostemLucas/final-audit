# Email Module

Módulo de envío de emails con soporte para templates HTML usando Handlebars.

## Instalación Completada ✅

Las dependencias están instaladas:

- `@nestjs-modules/mailer` - Wrapper de NestJS para nodemailer
- `nodemailer` - Motor de envío de emails
- `handlebars` - Motor de templates HTML
- `@types/nodemailer` - Tipos TypeScript

## Configuración

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@audit2.com
MAIL_FROM_NAME=Audit2
APP_NAME=Audit2
```

### Configuración Gmail (Recomendado para desarrollo)

1. Ve a https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos (actívala)
3. Contraseñas de aplicaciones → Genera para "Correo"
4. Usa esa contraseña en `MAIL_PASSWORD`

## Uso Rápido

```typescript
import { EmailService } from '@core'

@Injectable()
export class YourService {
  constructor(private emailService: EmailService) {}

  async sendVerification(user: UserEntity, token: string) {
    await this.emailService.sendVerificationEmail({
      to: user.email,
      userName: user.names,
      verificationLink: `https://app.com/verify?token=${token}`,
    })
  }
}
```

## Métodos Disponibles

### sendVerificationEmail()

Envía email de verificación de cuenta.

### sendTwoFactorCode()

Envía código 2FA (6 dígitos).

### sendResetPasswordEmail()

Envía link de recuperación de contraseña.

### sendWelcomeEmail()

Envía email de bienvenida.

### sendCustomEmail()

Método genérico para templates personalizados.

## Templates Incluidos

- `verify-email.hbs` - Verificación de email
- `two-factor-code.hbs` - Código 2FA
- `reset-password.hbs` - Recuperar contraseña
- `welcome.hbs` - Bienvenida

Todos usan el layout base con estilos profesionales.

## Preview en Desarrollo

En desarrollo, verás una URL de preview en la consola:

```bash
📧 Preview: https://ethereal.email/message/xxxxx
```

## Testing

```typescript
const mockEmailService = {
  sendVerificationEmail: jest.fn(),
}
```
