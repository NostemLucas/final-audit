# 🧪 Guía de Testing del Email Module

Esta guía te ayudará a probar el módulo de email de forma fácil y rápida.

---

## 🚀 Inicio Rápido

### 1. Configurar Email de Prueba (Ethereal)

Ethereal Email es un servicio gratuito que captura emails sin enviarlos realmente.

```bash
# Genera credenciales de prueba automáticamente
npx ts-node -r tsconfig-paths/register src/@core/email/setup-test-email.ts
```

Esto creará un archivo `.env.email-test` con las credenciales. Copia su contenido a tu `.env`.

### 2. Probar Todos los Tipos de Email

```bash
# Ejecuta todos los ejemplos de una vez
npx ts-node -r tsconfig-paths/register src/@core/email/email-examples.ts
```

Esto enviará:
- ✉️ Email de bienvenida
- ✅ Email de verificación
- 🔐 Código 2FA
- 🔑 Recuperación de contraseña
- 📨 Email personalizado

---

## 📧 Probar Emails Individuales

### Email de Bienvenida

```bash
npx ts-node -r tsconfig-paths/register src/@core/email/test-single-email.ts welcome
```

### Email de Verificación

```bash
npx ts-node -r tsconfig-paths/register src/@core/email/test-single-email.ts verify
```

### Código 2FA

```bash
npx ts-node -r tsconfig-paths/register src/@core/email/test-single-email.ts 2fa
```

### Recuperación de Contraseña

```bash
npx ts-node -r tsconfig-paths/register src/@core/email/test-single-email.ts reset
```

---

## 🎨 Crear y Probar Templates Personalizados

### 1. Crear un Template Nuevo

```bash
# Crea un template con nombre personalizado
npx ts-node -r tsconfig-paths/register src/@core/email/create-test-template.ts mi-template
```

Esto crea: `src/@core/email/templates/mi-template.hbs`

### 2. Probar el Template

```bash
npx ts-node -r tsconfig-paths/register src/@core/email/test-custom-template.ts mi-template
```

---

## ⚙️ Configuración

### Variables de Entorno Necesarias

Agrega estas variables a tu `.env`:

```bash
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

```bash
# En Linux/Mac
export TEST_EMAIL=tu-email@example.com
npx ts-node -r tsconfig-paths/register src/@core/email/email-examples.ts

# En Windows (PowerShell)
$env:TEST_EMAIL="tu-email@example.com"
npx ts-node -r tsconfig-paths/register src/@core/email/email-examples.ts

# O editando directamente el .env
TEST_EMAIL=tu-email@example.com
```

---

## 📂 Estructura de Archivos

```
src/@core/email/
├── email.service.ts              # Servicio principal
├── email.module.ts               # Módulo de NestJS
├── email-test.helper.ts          # Helper para testing
├── index.ts                      # Exports
│
├── templates/                    # Templates de Handlebars
│   ├── welcome.hbs              # Email de bienvenida
│   ├── verify-email.hbs         # Verificación de cuenta
│   ├── two-factor-code.hbs      # Código 2FA
│   ├── reset-password.hbs       # Recuperar contraseña
│   └── custom-notification.hbs  # Template personalizado
│
├── tests/                        # Scripts de testing
│   ├── setup-test-email.ts      # Configurar cuenta de prueba
│   ├── email-examples.ts        # Probar todos los emails
│   ├── test-single-email.ts     # Probar un email específico
│   ├── create-test-template.ts  # Crear template nuevo
│   ├── test-custom-template.ts  # Probar template personalizado
│   └── help.ts                  # Ayuda rápida
│
├── README.md                    # Documentación general
├── TESTING.md                   # Esta guía
└── INTEGRATION_EXAMPLE.md       # Ejemplos de integración
```

---

## 🌐 Ver Emails Enviados

### Con Ethereal Email

1. Ve a https://ethereal.email/login
2. Usa las credenciales generadas en `setup-test-email.ts`
3. Verás todos los emails capturados

### Preview URL en Logs

Cuando envías un email en desarrollo, verás algo como:

```
Email enviado exitosamente a test@example.com
📧 Preview: https://ethereal.email/message/abc123...
```

Haz clic en la URL para ver el email en tu navegador.

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@nestjs/core'"

```bash
npm install
```

### Error: "SMTP connection failed"

Verifica que las credenciales en `.env` sean correctas:

```bash
# Regenerar credenciales de prueba
npx ts-node -r tsconfig-paths/register src/@core/email/setup-test-email.ts
```

### Error: "Template not found"

Verifica que el template existe en `src/@core/email/templates/`:

```bash
ls -la src/@core/email/templates/
```

### Email no se envía

1. Verifica las variables de entorno:
   ```bash
   cat .env | grep MAIL
   ```

2. Verifica que el EmailModule esté importado en AppModule:
   ```typescript
   @Module({
     imports: [EmailModule, ...],
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

## 🚀 Siguiente Paso

Después de probar localmente:

1. Configura SMTP de producción (Gmail, SendGrid, AWS SES, etc.)
2. Actualiza las variables `MAIL_*` en tu entorno de producción
3. Los mismos scripts funcionarán sin cambios

---

**¿Necesitas ayuda?** Consulta:
- [README.md](./README.md) - Documentación completa del módulo
- [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) - Ejemplos de integración
