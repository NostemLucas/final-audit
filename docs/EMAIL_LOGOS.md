# Agregar Logos a los Templates de Email

Este documento explica las 3 formas de incluir logos en los emails de tu aplicación.

## Tabla de Contenidos

- [Opción 1: Base64 Embebido (Recomendado)](#opción-1-base64-embebido-recomendado)
- [Opción 2: URL Externa](#opción-2-url-externa)
- [Opción 3: CID Attachment](#opción-3-cid-attachment)
- [Comparación](#comparación)

---

## Opción 1: Base64 Embebido (Recomendado) ⭐

### ¿Por qué es la mejor?

✅ **No depende de servidores externos** - El logo va dentro del HTML
✅ **Funciona en todos los clientes de email** - Gmail, Outlook, Apple Mail, etc.
✅ **Siempre se muestra** - No se bloquea por filtros de imágenes
✅ **Funciona offline** - No requiere conexión para cargar el logo
✅ **Más fácil de implementar** - Solo necesitas el archivo del logo

❌ **Aumenta el tamaño del email** - Pero es mínimo (un logo de 50KB es aceptable)

### Implementación

#### 1. Crear Helper para Convertir a Base64

```typescript
// src/@core/email/utils/image-to-base64.ts
import * as fs from 'fs'
import * as path from 'path'

export class ImageHelper {
  /**
   * Convierte una imagen a Base64 para embeber en emails
   *
   * @param imagePath - Ruta al archivo de imagen
   * @returns String Base64 con data URI completo
   */
  static imageToBase64(imagePath: string): string {
    const absolutePath = path.resolve(imagePath)
    const imageBuffer = fs.readFileSync(absolutePath)
    const base64Image = imageBuffer.toString('base64')
    const extension = path.extname(imagePath).slice(1).toLowerCase()

    // Obtener MIME type correcto
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
    }

    const mimeType = mimeTypes[extension] || 'image/png'

    return `data:${mimeType};base64,${base64Image}`
  }
}
```

#### 2. Actualizar EmailService

```typescript
// src/@core/email/email.service.ts
import { ImageHelper } from './utils/image-to-base64'

@Injectable()
export class EmailService {
  private readonly logoBase64: string

  constructor(
    private readonly logger: LoggerService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    // ... código existente ...

    // Convertir logo a Base64 al inicializar el servicio
    const logoPath = path.join(__dirname, '../../assets/images/logo.png')
    this.logoBase64 = ImageHelper.imageToBase64(logoPath)
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    // ... código existente ...

    context: {
      ...options.context,
      appName: this.appName,
      currentYear: new Date().getFullYear(),
      logoBase64: this.logoBase64, // ← Agregar logo a todos los emails
    },
  }
}
```

#### 3. Actualizar Layout Base

```handlebars
<!-- src/@core/email/templates/layouts/base.hbs -->
<div class="header">
  {{#if logoBase64}}
    <img src="{{logoBase64}}" alt="{{appName}}" style="height: 50px; margin-bottom: 10px;">
  {{/if}}
  <h1>{{appName}}</h1>
</div>
```

#### 4. Estructura de Archivos Recomendada

```
src/
├── assets/
│   └── images/
│       ├── logo.png           (Logo principal)
│       ├── logo-white.png     (Logo para fondos oscuros)
│       └── icon.png           (Icono cuadrado)
├── @core/
│   └── email/
│       ├── utils/
│       │   └── image-to-base64.ts
│       ├── templates/
│       │   └── layouts/
│       │       └── base.hbs
│       └── email.service.ts
```

---

## Opción 2: URL Externa

### ¿Cuándo usarla?

✅ **Email más pequeño** - No aumenta el tamaño del HTML
✅ **Fácil de actualizar** - Cambias el logo en el servidor y todos los emails lo reflejan
✅ **Mejor para logos grandes** - Si tu logo es muy pesado (>100KB)

❌ **Requiere servidor público** - El logo debe estar hosteado
❌ **Puede ser bloqueado** - Muchos clientes de email bloquean imágenes externas por defecto
❌ **Requiere conexión** - El destinatario necesita internet para ver el logo
❌ **Tracking concerns** - Algunos usuarios desconfían de imágenes externas

### Implementación

#### 1. Hostear el Logo

Opciones:
- **Servidor propio**: `https://api.tuapp.com/public/logo.png`
- **CDN**: `https://cdn.tuapp.com/logo.png`
- **S3/Cloud Storage**: `https://bucket.s3.amazonaws.com/logo.png`
- **Cloudinary**: `https://res.cloudinary.com/tu-cuenta/logo.png`

#### 2. Configurar en Variables de Entorno

```bash
# .env
LOGO_URL=https://cdn.tuapp.com/logo.png
LOGO_WHITE_URL=https://cdn.tuapp.com/logo-white.png
```

#### 3. Actualizar EmailService

```typescript
@Injectable()
export class EmailService {
  private readonly logoUrl: string

  constructor(
    private readonly configService: ConfigService,
    // ...
  ) {
    this.logoUrl = this.configService.get<string>('LOGO_URL') || ''
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    context: {
      ...options.context,
      logoUrl: this.logoUrl, // ← Pasar URL del logo
    },
  }
}
```

#### 4. Actualizar Layout

```handlebars
<!-- src/@core/email/templates/layouts/base.hbs -->
<div class="header">
  {{#if logoUrl}}
    <img src="{{logoUrl}}" alt="{{appName}}" style="height: 50px; margin-bottom: 10px;">
  {{else}}
    <h1>{{appName}}</h1>
  {{/if}}
</div>
```

---

## Opción 3: CID Attachment

### ¿Cuándo usarla?

✅ **Buena compatibilidad** - Funciona en la mayoría de clientes de email
✅ **No aumenta el HTML** - El logo va como attachment separado
✅ **Siempre se muestra** - No se bloquea como las URLs externas

❌ **Más complejo** - Requiere configurar attachments
❌ **Aumenta el tamaño total** - El attachment va en cada email
❌ **Menos usado** - No es el estándar moderno

### Implementación

```typescript
// src/@core/email/email.service.ts
private async sendEmail(options: SendEmailOptions): Promise<void> {
  await this.mailerService.sendMail({
    to: options.to,
    from: `"${this.fromName}" <${this.fromEmail}>`,
    subject: options.subject,
    template: options.template,
    context: options.context,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../../assets/images/logo.png'),
        cid: 'logo@app' // ← Content ID único
      }
    ],
  })
}
```

```handlebars
<!-- En el template -->
<img src="cid:logo@app" alt="Logo" style="height: 50px;">
```

---

## Comparación

| Característica | Base64 | URL Externa | CID Attachment |
|----------------|--------|-------------|----------------|
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Compatibilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Siempre visible** | ✅ Sí | ❌ No | ✅ Sí |
| **Tamaño email** | +20-50KB | Sin cambio | +20-50KB |
| **Requiere hosting** | ❌ No | ✅ Sí | ❌ No |
| **Fácil de actualizar** | ❌ No | ✅ Sí | ❌ No |
| **Moderno** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

## Recomendación Final

### Para la mayoría de casos: **Base64 Embebido** ⭐

```typescript
// Ventajas:
✅ Funciona siempre
✅ No requiere infraestructura adicional
✅ Máxima compatibilidad
✅ Fácil de implementar

// Solo considera URL Externa si:
- Tu logo es muy grande (>100KB)
- Cambias el logo frecuentemente
- Tienes CDN configurado
```

## Tamaño Recomendado del Logo

Para emails:
- **Ancho**: 200-400px
- **Alto**: 50-100px
- **Formato**: PNG con transparencia o SVG
- **Peso**: <50KB (optimiza con TinyPNG)
- **Resolución**: 2x para pantallas Retina

## Ejemplo de Logo Optimizado

```bash
# Optimizar logo con ImageMagick
convert logo.png -resize 300x75 -quality 85 logo-email.png

# Optimizar con TinyPNG (mejor)
# https://tinypng.com/
```

## Script para Convertir Logos

```bash
# scripts/prepare-email-logo.sh
#!/bin/bash

# Convertir logo a formato optimizado para email
convert assets/images/logo-original.png \
  -resize 300x75 \
  -quality 85 \
  -strip \
  assets/images/logo.png

echo "✅ Logo optimizado para email"
echo "📦 Tamaño: $(du -h assets/images/logo.png | cut -f1)"
```
