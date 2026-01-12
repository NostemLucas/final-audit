# 🚀 Files Module - Guía Rápida de Inicio

## ⚡ Inicio Rápido (5 minutos)

### 1. Configuración Básica

Agrega estas líneas a tu `.env`:

```bash
UPLOADS_DIR=./uploads
APP_URL=http://localhost:3001
```

### 2. Verificar Configuración

**IMPORTANTE:** Primero verifica que todo esté configurado correctamente:

```bash
npm run files:verify
```

Este comando **lee automáticamente tu `.env`** y verificará:
- ✅ Variables de entorno (UPLOADS_DIR, APP_URL)
- ✅ Directorio uploads existe con permisos correctos
- ✅ Configuración en main.ts (useStaticAssets, CORS)
- ✅ Dependencias instaladas (multer, sharp, uuid)

**Resultado esperado:**
```
🎉 ¡Verificación exitosa!
   El sistema de archivos está correctamente configurado.

📝 Próximos pasos:
   1. Ejecuta: npm run files:test
   2. Inicia la app: npm run start:dev
   3. Prueba una URL: http://localhost:3001/uploads/test.jpg
```

Si hay errores, te dirá exactamente cómo corregirlos.

### 3. Primera Prueba

Ejecuta el test automático para verificar que todo funciona:

```bash
npm run files:test
```

**Resultado esperado:**
```
══════════════════════════════════════════════════════════════════════
  📁 Files Service - Prueba Completa
══════════════════════════════════════════════════════════════════════

📁 Configuración:
   UPLOADS_DIR: ./uploads
   APP_URL:     http://localhost:3001

📤 Subiendo archivo de prueba (image)...
   Archivo:   test-image-abc123.jpg
   Path:      test-uploads/test-image-abc123.jpg
   Tamaño:    70 bytes
   MIME:      image/jpeg
   URL:       http://localhost:3001/uploads/test-uploads/test-image-abc123.jpg
   ✓ Archivo subido exitosamente

...

══════════════════════════════════════════════════════════════════════
  ✓ Completado: 9 exitosos, 0 errores
══════════════════════════════════════════════════════════════════════
```

---

## 📝 Ejemplo Básico en tu Código

### Controlador (API endpoint)

```typescript
import { Controller, Post, UploadedFile } from '@nestjs/common'
import { FileUpload } from '@core/files/decorators/file-upload.decorator'
import { FileType } from '@core/files/enums/file-type.enum'

@Controller('users')
export class UsersController {
  @Post('avatar')
  @FileUpload('avatar', {
    fileType: FileType.IMAGE,
    maxSize: 2 * 1024 * 1024, // 2MB
  })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // El archivo ya está validado automáticamente
    return {
      success: true,
      fileName: file.originalname,
      size: file.size,
    }
  }
}
```

### Servicio (lógica de negocio)

```typescript
import { Injectable } from '@nestjs/common'
import { FilesService } from '@core/files'
import { FileType } from '@core/files/enums/file-type.enum'

@Injectable()
export class UserService {
  constructor(private readonly filesService: FilesService) {}

  async updateAvatar(userId: string, file: Express.Multer.File, oldAvatarPath: string | null) {
    // Reemplaza el avatar antiguo con el nuevo
    const result = await this.filesService.replaceFile(oldAvatarPath, {
      file: file,
      folder: `users/${userId}`,
      customFileName: 'avatar',
      validationOptions: {
        fileType: FileType.IMAGE,
        maxSize: 2 * 1024 * 1024,
        minWidth: 100,
        minHeight: 100,
      },
    })

    // Guarda la nueva ruta en la base de datos
    await this.userRepository.update(userId, {
      avatarPath: result.filePath,
      avatarUrl: result.url,
    })

    return result
  }
}
```

---

## 🎯 Casos de Uso Comunes

### 1. Avatar de Usuario

```typescript
// Opción 1: Usar configuración predefinida
import { FILE_UPLOAD_CONFIGS } from '@core/files'

@Post('avatar')
@FileUpload('avatar', FILE_UPLOAD_CONFIGS.USER_AVATAR)
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  return await this.userService.updateAvatar(userId, file)
}
```

### 2. Logo de Organización

```typescript
@Post('logo')
@FileUpload('logo', FILE_UPLOAD_CONFIGS.ORGANIZATION_LOGO)
async uploadLogo(@UploadedFile() file: Express.Multer.File) {
  const result = await this.filesService.uploadFile({
    file,
    folder: `organizations/${orgId}`,
    customFileName: 'logo',
    validationOptions: FILE_UPLOAD_CONFIGS.ORGANIZATION_LOGO,
  })

  return result
}
```

### 3. Documentos (PDF, Word, etc.)

```typescript
@Post('documents')
@FileUpload('document', FILE_UPLOAD_CONFIGS.DOCUMENT)
async uploadDocument(@UploadedFile() file: Express.Multer.File) {
  const result = await this.filesService.uploadFile({
    file,
    folder: 'documents',
    validationOptions: FILE_UPLOAD_CONFIGS.DOCUMENT,
  })

  return result
}
```

### 4. Múltiples Archivos

```typescript
import { FileUploads } from '@core/files/decorators/file-uploads.decorator'

@Post('upload-multiple')
@FileUploads('files', {
  fileType: FileType.DOCUMENT,
  maxSize: 10 * 1024 * 1024,
})
async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
  const results = await Promise.all(
    files.map(file =>
      this.filesService.uploadFile({
        file,
        folder: 'documents',
        validationOptions: FILE_UPLOAD_CONFIGS.DOCUMENT,
      })
    )
  )

  return { count: results.length, files: results }
}
```

---

## 🧪 Testing Manual

### Comandos más útiles

```bash
# 1. Test completo (recomendado para empezar)
npm run files:test

# 2. Subir una imagen de prueba
npm run files:test upload image

# 3. Subir un PDF de prueba
npm run files:test upload pdf

# 4. Verificar si un archivo existe
npm run files:test exists test-uploads/archivo.jpg

# 5. Obtener URL de un archivo
npm run files:test url test-uploads/archivo.jpg

# 6. Eliminar un archivo
npm run files:test delete test-uploads/archivo.jpg

# 7. Probar reemplazo de archivo
npm run files:test replace
```

---

## 📦 Configuraciones Predefinidas

```typescript
import { FILE_UPLOAD_CONFIGS, FileType } from '@core/files'

// Avatar de usuario (2MB, 100x100 a 2000x2000)
FILE_UPLOAD_CONFIGS.USER_AVATAR

// Logo de organización (5MB, 200x200 a 3000x3000)
FILE_UPLOAD_CONFIGS.ORGANIZATION_LOGO

// Documento general (10MB)
FILE_UPLOAD_CONFIGS.DOCUMENT

// PDF específico (20MB)
FILE_UPLOAD_CONFIGS.PDF

// Hoja de cálculo (15MB)
FILE_UPLOAD_CONFIGS.SPREADSHEET
```

### O crea tu propia configuración:

```typescript
{
  fileType: FileType.IMAGE,
  maxSize: 5 * 1024 * 1024,  // 5MB
  minWidth: 200,              // mínimo 200px de ancho
  minHeight: 200,             // mínimo 200px de alto
  maxWidth: 4000,             // máximo 4000px de ancho
  maxHeight: 4000,            // máximo 4000px de alto
}
```

---

## 🔒 Validaciones Automáticas

Cuando subes un archivo, el sistema valida automáticamente:

✅ **Tipo de archivo** (MIME type)
✅ **Tamaño máximo**
✅ **Dimensiones** (solo para imágenes)
✅ **Nombres seguros** (sin caracteres peligrosos)
✅ **Paths seguros** (previene path traversal)

---

## 🛠️ API del FilesService

```typescript
// 1. Subir archivo
const result = await filesService.uploadFile({
  file: multerFile,
  folder: 'carpeta/destino',
  validationOptions: { /* config */ },
  customFileName: 'nombre-personalizado', // opcional
  overwrite: true, // opcional
})

// 2. Reemplazar archivo (sube nuevo y elimina antiguo)
const result = await filesService.replaceFile(
  'path/antiguo/archivo.jpg', // null si no hay archivo antiguo
  { /* mismas opciones que uploadFile */ }
)

// 3. Eliminar archivo
await filesService.deleteFile('path/al/archivo.jpg')

// 4. Verificar existencia
const exists = await filesService.fileExists('path/al/archivo.jpg')

// 5. Obtener URL pública
const url = filesService.getFileUrl('path/al/archivo.jpg')
// Retorna: http://localhost:3001/uploads/path/al/archivo.jpg
```

---

## 📁 Estructura de Archivos

Los archivos se organizan así:

```
uploads/
├── users/
│   ├── 123/
│   │   ├── avatar.jpg
│   │   └── documents/
│   │       └── cv.pdf
│   └── 456/
│       └── avatar.jpg
├── organizations/
│   └── org-1/
│       └── logo.png
└── documents/
    ├── report-1.pdf
    └── spreadsheet-1.xlsx
```

---

## 🎨 Resultado de Subida

Cada subida exitosa retorna:

```typescript
{
  fileName: 'avatar.jpg',                    // Nombre del archivo guardado
  filePath: 'users/123/avatar.jpg',          // Path relativo
  url: 'http://localhost:3001/uploads/users/123/avatar.jpg',  // URL pública
  size: 45678,                               // Tamaño en bytes
  mimeType: 'image/jpeg'                     // Tipo MIME
}
```

---

## 🐛 Problemas Comunes

### Error: "File type not allowed"
**Causa**: El MIME type del archivo no está permitido
**Solución**: Verifica que estés usando el `FileType` correcto o agrega `additionalMimeTypes`

### Error: "File too large"
**Causa**: El archivo excede `maxSize`
**Solución**: Aumenta el límite o comprime el archivo

### Archivos no se ven en la web
**Causa**: Express no está sirviendo archivos estáticos
**Solución**: En `main.ts`:
```typescript
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
})
```

---

## 📚 Siguientes Pasos

1. ✅ **Configura** las variables de entorno
2. ✅ **Prueba** con `npm run files:test`
3. ✅ **Implementa** tu primer endpoint de subida
4. 📖 **Lee** el [README.md](./README.md) completo para casos avanzados
5. 🧪 **Escribe** tests para tu implementación

---

## 💡 Tips

- Usa `FILE_UPLOAD_CONFIGS` para casos comunes
- Siempre usa `replaceFile()` para avatars/logos (elimina el antiguo automáticamente)
- Los nombres de archivo son únicos (UUID) para evitar colisiones
- Las imágenes se redimensionan automáticamente si exceden las dimensiones máximas
- El sistema elimina carpetas vacías automáticamente al borrar archivos

---

**¡Listo para empezar!** 🚀

Si tienes dudas, revisa:
- [README.md](./README.md) - Documentación completa
- [files.test.ts](./files.test.ts) - Ejemplos de uso
- [files.service.spec.ts](./files.service.spec.ts) - Tests unitarios
