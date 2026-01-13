# Assets - Imágenes para Emails

## Logo para Emails

Coloca tu logo en: `logo.png`

### Especificaciones Recomendadas

**Dimensiones:**
- Ancho: 200-400px
- Alto: 50-100px
- Ratio: 3:1 o 4:1 (horizontal)

**Formato:**
- PNG con transparencia (recomendado)
- SVG (alternativa)
- JPG (si no necesitas transparencia)

**Peso:**
- Máximo: 50KB
- Ideal: 20-30KB
- Optimiza con [TinyPNG](https://tinypng.com/)

**Resolución:**
- 2x para pantallas Retina (opcional)
- Ej: Logo de 300px físicos → 600px reales

### Ejemplo

Si tu logo es `mi-logo.png` (500KB, 2000x500px):

```bash
# Opción 1: Con ImageMagick
convert mi-logo.png -resize 300x75 -quality 85 logo.png

# Opción 2: Con pngquant (mejor compresión)
pngquant --quality=65-80 --output logo.png mi-logo.png

# Opción 3: Online
# Sube tu logo a https://tinypng.com/
# Descarga el resultado como logo.png
```

### Resultado

Después de colocar `logo.png` aquí:
✅ El logo aparecerá automáticamente en todos los emails
✅ Se carga en memoria al iniciar la app (rápido)
✅ Funciona en todos los clientes de email

### Logos Alternativos (Opcionales)

Puedes tener múltiples logos para diferentes propósitos:

- `logo.png` - Logo principal (usado por defecto)
- `logo-white.png` - Logo blanco para fondos oscuros
- `icon.png` - Icono cuadrado (32x32 o 64x64)
- `banner.png` - Banner para headers grandes

Para usar logos alternativos, modifica el código en:
`src/@core/email/email.service.ts`

### Variables de Entorno (Alternativa)

Si prefieres usar un logo hosteado en lugar de Base64:

```bash
# .env
LOGO_URL=https://cdn.tuapp.com/logo.png
```

El sistema usará automáticamente esta URL si está configurada.

### ¿Qué Método Usar?

**Base64 (recomendado):**
✅ Coloca `logo.png` aquí
✅ Funciona siempre, en todos los clientes

**URL Externa:**
✅ Configura `LOGO_URL` en .env
❌ Puede ser bloqueada por algunos clientes de email
❌ Requiere servidor para hostear el logo

### Troubleshooting

**El logo no aparece:**
1. Verifica que el archivo se llame exactamente `logo.png`
2. Verifica que esté en la ruta correcta: `assets/images/logo.png`
3. Revisa los logs al iniciar la app - debe decir "✅ Logo cargado"
4. Prueba con `npm run email:test` para ver el preview

**El logo es muy grande:**
1. Optimízalo con TinyPNG
2. Redimensiona a 300x75px
3. Verifica el peso con: `du -h assets/images/logo.png`
4. Debe ser <50KB

**Quiero usar un logo diferente en algunos emails:**
Puedes pasar el logo como contexto en el template:

```typescript
await this.emailService.sendCustomEmail(
  'usuario@example.com',
  'Asunto',
  'mi-template',
  {
    logoBase64: ImageHelper.imageToBase64('./path/to/special-logo.png')
  }
)
```
