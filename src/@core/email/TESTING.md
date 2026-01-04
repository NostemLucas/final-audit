# 🧪 Guía de Testing del Email Module

Esta guía te ayudará a probar el módulo de email de forma fácil y rápida.

---

## 🚀 Inicio Rápido

### 1. Configurar Email de Prueba (Ethereal)

Ethereal Email es un servicio gratuito que captura emails sin enviarlos realmente.

```bash
# Genera credenciales de prueba automáticamente
npm run email:test:setup
```

Esto creará un archivo `.env.email-test` con las credenciales. Copia su contenido a tu `.env`.

### 2. Probar Todos los Tipos de Email

```bash
# Ejecuta todos los ejemplos de una vez
npm run email:test
```

Esto enviará:
- 👋 Email de bienvenida
- ✉️ Email de verificación
- 🔐 Código 2FA
- 🔑 Recuperación de contraseña

---

## 📧 Probar Emails Individuales

### Email de Bienvenida

```bash
npm run email:test:welcome
```

### Email de Verificación

```bash
npm run email:test:verify
```

### Código 2FA

```bash
npm run email:test:2fa
```

### Recuperación de Contraseña

```bash
npm run email:test:reset
```

---

## 🎨 Crear y Probar Templates Personalizados

### 1. Crear un Template Nuevo

```bash
npm run email:template:create
# O con nombre personalizado:
npm run email:template:create mi-template
```

Esto crea: `src/@core/email/templates/mi-template.hbs`

### 2. Probar el Template

```bash
npm run email:test custom mi-template
```

---

## ⚙️ Configuración

### Variables de Entorno Necesarias

Agrega estas variables a tu `.env`:

```env
# SMTP Configuration
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-usuario@ethereal.email
MAIL_PASSWORD=tu-contraseña

# Email Defaults
MAIL_FROM=noreply@audit-core.com
MAIL_FROM_NAME=Audit Core

# App Info
APP_NAME=Audit Core

# Email de prueba (para los scripts)
TEST_EMAIL=test@example.com
```

### Cambiar el Email de Destino

Edita la variable `TEST_EMAIL` en tu `.env`:

```env
TEST_EMAIL=tu-email@example.com
```

---

## 📂 Estructura de Archivos

```
src/@core/email/
├── email.service.ts              # Servicio principal
├── email.module.ts               # Módulo de NestJS
├── email.test.ts                 # Script de testing consolidado ✨ NUEVO
├── index.ts                      # Exports
│
├── scripts/                      # Utilities ✨ NUEVO
│   └── create-template.ts        # Crear templates personalizados
│
├── templates/                    # Templates de Handlebars
│   ├── layouts/
│   │   └── base.hbs             # Layout base
│   ├── welcome.hbs              # Email de bienvenida
│   ├── verify-email.hbs         # Verificación de cuenta
│   ├── two-factor-code.hbs      # Código 2FA
│   └── reset-password.hbs       # Recuperar contraseña
│
├── README.md                    # Documentación general
├── TESTING.md                   # Esta guía
└── INTEGRATION_EXAMPLE.md       # Ejemplos de integración
```

### ✨ Cambios Recientes

**Simplificación completada:**
- ❌ Eliminado directorio `tests/` con 6 archivos
- ❌ Eliminado `email-test.helper.ts` (funcionalidad integrada)
- ✅ Creado `email.test.ts` - un solo archivo consolidado
- ✅ Creado `scripts/` para utilities
- 📊 **Reducción**: 7 archivos → 2 archivos (71% menos código)

---

## 🌐 Ver Emails Enviados

### Con Ethereal Email

1. Ve a https://ethereal.email/login
2. Usa las credenciales generadas en `npm run email:test:setup`
3. Verás todos los emails capturados

### Preview URL en Logs

Cuando envías un email en desarrollo, verás algo como:

```
21:15:30 ℹ INFO [http] Email enviado exitosamente a test@example.com
21:15:30 ℹ INFO [http] 📧 Preview: https://ethereal.email/message/abc123...
```

Haz clic en la URL para ver el email en tu navegador.

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

```bash
npm install
```

### Error: "SMTP connection failed"

Verifica que las credenciales en `.env` sean correctas:

```bash
# Regenerar credenciales de prueba
npm run email:test:setup
```

### Error: "wrong version number" (SSL)

Tu `MAIL_SECURE` debe ser `false` para puerto 587:

```env
MAIL_PORT=587
MAIL_SECURE=false  # ← Importante: debe ser "false", no "true"
```

### Error: "Template not found"

Verifica que el template existe:

```bash
ls -la src/@core/email/templates/
```

### Email no se envía

1. Verifica las variables de entorno:
   ```bash
   cat .env | grep MAIL
   ```

2. Verifica que `ConfigModule.forRoot()` esté configurado en `AppModule`:
   ```typescript
   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: '.env',
       }),
       EmailModule,
       // ...
     ],
   })
   ```

3. Prueba con credenciales de Ethereal primero antes de usar SMTP real

---

## 📚 Ejemplos de Uso en Código

### En un Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common'
import { EmailService } from '@core/email/email.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly emailService: EmailService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.userService.create(dto)

    // Enviar email de bienvenida
    await this.emailService.sendWelcomeEmail({
      to: user.email,
      userName: user.name,
      loginLink: 'https://audit-core.com/login',
    })

    return { success: true }
  }
}
```

### En un Service

```typescript
import { Injectable } from '@nestjs/common'
import { EmailService } from '@core/email/email.service'

@Injectable()
export class UserService {
  constructor(private readonly emailService: EmailService) {}

  async requestPasswordReset(email: string) {
    const user = await this.findByEmail(email)
    const token = this.generateResetToken()

    await this.emailService.sendResetPasswordEmail({
      to: user.email,
      userName: user.name,
      resetLink: `https://audit-core.com/reset?token=${token}`,
      expiresInMinutes: 30,
    })
  }
}
```

### Email Personalizado

```typescript
await this.emailService.sendCustomEmail(
  'user@example.com',
  'Notificación Importante',
  'custom-notification',
  {
    userName: 'Juan',
    message: 'Tu reporte está listo',
    actionUrl: 'https://audit-core.com/reports/123',
    actionText: 'Ver Reporte',
  }
)
```

---

## 🎯 Tips

1. **Usa Ethereal Email para desarrollo** - Es gratis y no requiere configuración de servidor SMTP real

2. **Guarda las URLs de preview** - Son útiles para ver cómo se ven los emails sin abrir el navegador

3. **Prueba templates antes de usarlos** - Usa los scripts de testing antes de integrar en producción

4. **Personaliza los templates** - Edita los archivos `.hbs` para ajustar el diseño a tu marca

5. **Variables de entorno por ambiente:**
   - `.env.development` - Ethereal Email
   - `.env.production` - SMTP real (Gmail, SendGrid, etc.)

---

## 📝 Crear Templates Nuevos

Los templates usan **Handlebars**. Variables disponibles:

- `{{appName}}` - Nombre de la aplicación
- `{{currentYear}}` - Año actual
- `{{userName}}` - Nombre del usuario
- Cualquier variable que pases en `context`

### Ejemplo de Template

```handlebars
<!DOCTYPE html>
<html>
<body>
  <h1>Hola {{userName}}!</h1>
  <p>Bienvenido a {{appName}}</p>

  {{#if actionUrl}}
    <a href="{{actionUrl}}">{{actionText}}</a>
  {{/if}}

  <footer>© {{currentYear}} {{appName}}</footer>
</body>
</html>
```

---

## 🎨 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run email:test` | Probar todos los emails |
| `npm run email:test:setup` | Configurar cuenta Ethereal |
| `npm run email:test:welcome` | Probar email de bienvenida |
| `npm run email:test:verify` | Probar email de verificación |
| `npm run email:test:2fa` | Probar código 2FA |
| `npm run email:test:reset` | Probar recuperación de contraseña |
| `npm run email:template:create` | Crear template personalizado |

---

## 🚀 Siguiente Paso

Después de probar localmente:

1. Configura SMTP de producción (Gmail, SendGrid, AWS SES, etc.)
2. Actualiza las variables `MAIL_*` en tu entorno de producción
3. Los mismos scripts funcionarán sin cambios

---

**¿Necesitas ayuda?** Consulta:
- [README.md](./README.md) - Documentación completa del módulo
- [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) - Ejemplos de integración
