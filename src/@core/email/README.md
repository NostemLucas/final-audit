# Email Module

Módulo de envío de emails con soporte para templates HTML usando Handlebars.

## Instalación Completada ✅

Las dependencias están instaladas:

- `@nestjs-modules/mailer` - Wrapper de NestJS para nodemailer
- `nodemailer` - Motor de envío de emails
- `handlebars` - Motor de templates HTML
- `@types/nodemailer` - Tipos TypeScript

## Configuración

### 1. ConfigModule en AppModule

**IMPORTANTE:** El módulo de email requiere que `ConfigModule` esté configurado globalmente en tu `AppModule`:

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EmailModule } from '@core/email'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmailModule,
    // ... otros módulos
  ],
})
export class AppModule {}
```

### 2. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

#### Para Desarrollo (Ethereal Email - Recomendado)

```env
# Email Configuration
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-usuario@ethereal.email
MAIL_PASSWORD=tu-password-ethereal
MAIL_FROM=noreply@audit-core.com
MAIL_FROM_NAME=Audit Core
APP_NAME=Audit Core
```

**Generar credenciales Ethereal automáticamente:**

```bash
npm run email:test:setup
```

Esto creará `.env.email-test` con credenciales listas para copiar.

#### Para Producción (Gmail)

```env
# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # No uses tu contraseña real
MAIL_FROM=noreply@audit-core.com
MAIL_FROM_NAME=Audit Core
APP_NAME=Audit Core
```

**Configuración Gmail:**

1. Ve a https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos (actívala)
3. Contraseñas de aplicaciones → Genera para "Correo"
4. Usa esa contraseña en `MAIL_PASSWORD`

### 3. Importar EmailModule

El módulo ya debería estar importado en `AppModule`. Si no:

```typescript
import { EmailModule } from '@core/email'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EmailModule,
  ],
})
export class AppModule {}
```

## Uso Rápido

```typescript
import { EmailService } from '@core/email'

@Injectable()
export class YourService {
  constructor(private emailService: EmailService) {}

  async sendVerification(user: User, token: string) {
    await this.emailService.sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationLink: `https://app.com/verify?token=${token}`,
    })
  }
}
```

## Métodos Disponibles

### sendWelcomeEmail()

Envía email de bienvenida a nuevos usuarios.

```typescript
await emailService.sendWelcomeEmail({
  to: 'user@example.com',
  userName: 'Juan Pérez',
  loginLink: 'https://app.com/login',
})
```

### sendVerificationEmail()

Envía email de verificación de cuenta.

```typescript
await emailService.sendVerificationEmail({
  to: 'user@example.com',
  userName: 'María García',
  verificationLink: 'https://app.com/verify?token=abc123',
})
```

### sendTwoFactorCode()

Envía código 2FA (6 dígitos).

```typescript
await emailService.sendTwoFactorCode({
  to: 'user@example.com',
  userName: 'Carlos Rodríguez',
  code: '123456',
  expiresInMinutes: 10,
})
```

### sendResetPasswordEmail()

Envía link de recuperación de contraseña.

```typescript
await emailService.sendResetPasswordEmail({
  to: 'user@example.com',
  userName: 'Ana Martínez',
  resetLink: 'https://app.com/reset?token=xyz789',
  expiresInMinutes: 30,
})
```

### sendCustomEmail()

Método genérico para templates personalizados.

```typescript
await emailService.sendCustomEmail(
  'user@example.com',
  'Título del Email',
  'mi-template',  // nombre del template (sin .hbs)
  {
    userName: 'Usuario',
    customData: 'Datos personalizados',
  }
)
```

## Templates Incluidos

- `welcome.hbs` - Email de bienvenida
- `verify-email.hbs` - Verificación de email
- `two-factor-code.hbs` - Código 2FA
- `reset-password.hbs` - Recuperar contraseña

Todos usan el layout base con estilos profesionales responsive.

## Preview en Desarrollo

En desarrollo (`NODE_ENV !== 'production'`), verás una URL de preview en los logs:

```bash
21:15:30 ℹ INFO [http] Email enviado exitosamente a test@example.com
21:15:30 ℹ INFO [http] 📧 Preview: https://ethereal.email/message/xxxxx
```

Haz clic en la URL para ver cómo se ve el email.

## Testing

### Probar Todos los Emails

```bash
npm run email:test
```

### Probar Email Específico

```bash
npm run email:test:welcome
npm run email:test:verify
npm run email:test:2fa
npm run email:test:reset
```

### Crear Template Personalizado

```bash
npm run email:template:create mi-template
```

Ver más en [TESTING.md](./TESTING.md)

## Estructura de Archivos

```
src/@core/email/
├── email.service.ts              # Servicio principal
├── email.module.ts               # Módulo de NestJS
├── email.test.ts                 # Testing consolidado
├── index.ts                      # Exports
├── scripts/
│   └── create-template.ts        # Utility para crear templates
└── templates/
    ├── layouts/
    │   └── base.hbs             # Layout base
    ├── welcome.hbs
    ├── verify-email.hbs
    ├── two-factor-code.hbs
    └── reset-password.hbs
```

## Troubleshooting

### Error: "Cannot resolve dependencies of EmailService"

Asegúrate de que `ConfigModule.forRoot()` esté en `AppModule`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmailModule,
  ],
})
```

### Error: "wrong version number" (SSL)

Para puerto 587, `MAIL_SECURE` debe ser `false`:

```env
MAIL_PORT=587
MAIL_SECURE=false  # ← No "true"
```

### Email no se envía

1. Verifica las credenciales en `.env`
2. Prueba con Ethereal Email primero
3. Revisa los logs para ver el error específico

## Testing en Código

Para tests unitarios:

```typescript
const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendTwoFactorCode: jest.fn(),
  sendResetPasswordEmail: jest.fn(),
  sendCustomEmail: jest.fn(),
}

// En tu test
beforeEach(() => {
  const module = await Test.createTestingModule({
    providers: [
      YourService,
      {
        provide: EmailService,
        useValue: mockEmailService,
      },
    ],
  }).compile()
})
```

## Documentación Adicional

- [TESTING.md](./TESTING.md) - Guía completa de testing
- [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) - Ejemplos de integración con autenticación

## Próximos Pasos

1. Genera credenciales de prueba: `npm run email:test:setup`
2. Prueba los emails: `npm run email:test`
3. Integra en tu código según los ejemplos arriba
4. Para producción, cambia a SMTP real (Gmail, SendGrid, AWS SES, etc.)
