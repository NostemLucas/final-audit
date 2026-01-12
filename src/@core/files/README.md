# 📁 Files Module - Sistema de Gestión de Archivos

Módulo completo para la gestión de archivos en la aplicación. Soporta subida, eliminación, validación y almacenamiento local de archivos con una arquitectura extensible.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Configuración](#-configuración)
- [Tipos de Archivos Soportados](#-tipos-de-archivos-soportados)
- [Uso en el Código](#-uso-en-el-código)
- [Decoradores](#-decoradores)
- [Testing Manual](#-testing-manual)
- [Estructura del Módulo](#-estructura-del-módulo)
- [Seguridad](#-seguridad)

---

## ✨ Características

- ✅ **Validación automática** de tipo, tamaño y dimensiones (imágenes)
- 🖼️ **Redimensionamiento de imágenes** con Sharp
- 📦 **Almacenamiento local** con soporte para múltiples carpetas
- 🔒 **Seguridad** contra path traversal y nombres maliciosos
- 🗑️ **Limpieza automática** de carpetas vacías al eliminar archivos
- 🎯 **Decoradores personalizados** para controladores NestJS
- 📝 **Logging integrado** con el sistema de logs del proyecto
- 🧪 **Herramienta de testing** para pruebas manuales

---

## ⚙️ Configuración

### 1. Variables de entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Directorio donde se guardarán los archivos
UPLOADS_DIR=./uploads

# URL base de la aplicación (para generar URLs de acceso)
APP_URL=http://localhost:3001
```

### 2. Servir archivos estáticos

En tu `main.ts`, configura Express para servir los archivos:

```typescript
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Servir archivos estáticos desde la carpeta uploads
  const uploadsDir = process.env.UPLOADS_DIR || './uploads'
  app.useStaticAssets(join(process.cwd(), uploadsDir), {
    prefix: '/uploads/',
  })

  await app.listen(3001)
}
```

---

## 📦 Tipos de Archivos Soportados

El módulo define tipos predefinidos con sus MIME types permitidos:

| Tipo | Enum | MIME Types Permitidos |
|------|------|----------------------|
| **Imágenes** | `FileType.IMAGE` | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` |
| **Documentos** | `FileType.DOCUMENT` | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain` |
| **PDFs** | `FileType.PDF` | `application/pdf` |
| **Hojas de cálculo** | `FileType.SPREADSHEET` | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv` |
| **Videos** | `FileType.VIDEO` | `video/mp4`, `video/mpeg`, `video/quicktime`, `video/webm` |
| **Audio** | `FileType.AUDIO` | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/webm` |

### Configuraciones Predefinidas

```typescript
import { FILE_UPLOAD_CONFIGS } from '@core/files'

// Avatar de usuario (2MB, imagen 100x100 a 2000x2000)
FILE_UPLOAD_CONFIGS.USER_AVATAR

// Logo de organización (5MB, imagen 200x200 a 3000x3000)
FILE_UPLOAD_CONFIGS.ORGANIZATION_LOGO

// Documento general (10MB)
FILE_UPLOAD_CONFIGS.DOCUMENT

// PDF (20MB)
FILE_UPLOAD_CONFIGS.PDF

// Hoja de cálculo (15MB)
FILE_UPLOAD_CONFIGS.SPREADSHEET
```

---

## 💻 Uso en el Código

### 1. Inyectar el servicio

```typescript
import { Injectable } from '@nestjs/common'
import { FilesService } from '@core/files'
import { FileType } from '@core/files/enums/file-type.enum'

@Injectable()
export class UserService {
  constructor(private readonly filesService: FilesService) {}
}
```

### 2. Subir un archivo

```typescript
async uploadAvatar(userId: string, file: Express.Multer.File) {
  // Subir con validación
  const result = await this.filesService.uploadFile({
    file: file,
    folder: `users/${userId}/avatars`,
    validationOptions: {
      fileType: FileType.IMAGE,
      maxSize: 2 * 1024 * 1024, // 2MB
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2000,
      maxHeight: 2000,
    },
    customFileName: 'avatar', // Opcional: nombre personalizado
    overwrite: true, // Opcional: sobrescribir si existe
  })

  // result contiene:
  // {
  //   fileName: 'avatar.jpg',
  //   filePath: 'users/123/avatars/avatar.jpg',
  //   url: 'http://localhost:3001/uploads/users/123/avatars/avatar.jpg',
  //   size: 45678,
  //   mimeType: 'image/jpeg'
  // }

  return result
}
```

### 3. Usar configuraciones predefinidas

```typescript
import { FILE_UPLOAD_CONFIGS } from '@core/files'

async uploadDocument(file: Express.Multer.File) {
  const result = await this.filesService.uploadFile({
    file: file,
    folder: 'documents',
    validationOptions: FILE_UPLOAD_CONFIGS.DOCUMENT,
  })

  return result
}
```

### 4. Reemplazar un archivo (útil para avatars/logos)

```typescript
async updateAvatar(userId: string, newFile: Express.Multer.File, oldFilePath: string | null) {
  // Sube el nuevo y elimina el antiguo automáticamente
  const result = await this.filesService.replaceFile(oldFilePath, {
    file: newFile,
    folder: `users/${userId}/avatars`,
    validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR,
    customFileName: 'avatar',
  })

  return result
}
```

### 5. Eliminar un archivo

```typescript
async deleteFile(filePath: string) {
  await this.filesService.deleteFile(filePath)
}
```

### 6. Verificar existencia

```typescript
async checkFile(filePath: string): Promise<boolean> {
  return await this.filesService.fileExists(filePath)
}
```

### 7. Obtener URL

```typescript
getFileUrl(filePath: string): string {
  return this.filesService.getFileUrl(filePath)
  // Retorna: http://localhost:3001/uploads/path/to/file.jpg
}
```

---

## 🎨 Decoradores

### `@FileUpload()` - Subir un solo archivo

```typescript
import { Controller, Post } from '@nestjs/common'
import { FileUpload } from '@core/files/decorators/file-upload.decorator'
import { FileType } from '@core/files/enums/file-type.enum'

@Controller('users')
export class UsersController {
  @Post('avatar')
  @FileUpload('avatar', {
    fileType: FileType.IMAGE,
    maxSize: 2 * 1024 * 1024, // 2MB
    minWidth: 100,
    minHeight: 100,
  })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // El archivo ya está validado automáticamente
    return { message: 'Avatar subido', file }
  }
}
```

### `@FileUploads()` - Subir múltiples archivos

```typescript
import { FileUploads } from '@core/files/decorators/file-uploads.decorator'

@Controller('documents')
export class DocumentsController {
  @Post('upload-multiple')
  @FileUploads('documents', {
    fileType: FileType.DOCUMENT,
    maxSize: 10 * 1024 * 1024, // 10MB
  })
  async uploadDocuments(@UploadedFiles() files: Express.Multer.File[]) {
    // Todos los archivos ya están validados
    return {
      message: 'Documentos subidos',
      count: files.length,
      files
    }
  }
}
```

---

## 🧪 Testing Manual

El módulo incluye una herramienta CLI para testing manual completo.

### Comandos disponibles

```bash
# Probar todas las operaciones (recomendado para empezar)
npm run files:test

# Subir archivos de prueba
npm run files:test upload         # Imagen (por defecto)
npm run files:test upload image   # Imagen JPEG 1x1 pixel
npm run files:test upload pdf     # PDF mínimo válido
npm run files:test upload text    # Archivo de texto

# Eliminar un archivo
npm run files:test delete test-uploads/test-image.jpg

# Verificar si existe
npm run files:test exists test-uploads/test-image.jpg

# Obtener URL de un archivo
npm run files:test url test-uploads/test-image.jpg

# Probar reemplazo de archivo
npm run files:test replace

# Mostrar ayuda
npm run files:test help
```

### Ejemplo de salida

```bash
$ npm run files:test

══════════════════════════════════════════════════════════════════
  📁 Files Service - Prueba Completa
══════════════════════════════════════════════════════════════════

📁 Configuración:
   UPLOADS_DIR: ./uploads
   APP_URL:     http://localhost:3001

📤 Subiendo archivo de prueba (image)...
   Archivo:   test-image-abc123.jpg
   Path:      test-uploads/test-image-abc123.jpg
   Tamaño:    95 bytes
   MIME:      image/jpeg
   URL:       http://localhost:3001/uploads/test-uploads/test-image-abc123.jpg
   ✓ Archivo subido exitosamente

🔍 Verificando existencia: test-uploads/test-image-abc123.jpg...
   ✓ El archivo existe

🔗 Obteniendo URL: test-uploads/test-image-abc123.jpg...
   URL: http://localhost:3001/uploads/test-uploads/test-image-abc123.jpg

...

══════════════════════════════════════════════════════════════════
  ✓ Completado: 9 exitosos, 0 errores
══════════════════════════════════════════════════════════════════
```

---

## 📂 Estructura del Módulo

```
src/@core/files/
├── README.md                        # Este archivo
├── files.module.ts                  # Módulo principal
├── files.service.ts                 # Servicio de orquestación
├── files.test.ts                    # Herramienta de testing CLI
│
├── decorators/                      # Decoradores para controladores
│   ├── file-upload.decorator.ts    # @FileUpload() - un archivo
│   └── file-uploads.decorator.ts   # @FileUploads() - múltiples
│
├── dtos/                            # DTOs de configuración
│   └── file-upload-options.dto.ts  # Opciones de validación
│
├── enums/                           # Enumeraciones
│   └── file-type.enum.ts            # Tipos de archivo + MIME types
│
├── interfaces/                      # Interfaces
│   └── storage.interface.ts         # Contrato para servicios de storage
│
├── services/                        # Implementaciones de storage
│   ├── local-storage.service.ts    # Almacenamiento local (default)
│   └── local-storage.service.spec.ts
│
└── validators/                      # Validadores
    ├── file.validator.ts            # Validación de archivos
    └── file.validator.spec.ts
```

---

## 🔒 Seguridad

### Protecciones implementadas

1. **Validación de tipo MIME**
   - Solo se permiten tipos de archivo configurados
   - No se confía en la extensión del archivo

2. **Validación de tamaño**
   - Límite configurable por tipo de archivo
   - Previene ataques de denegación de servicio

3. **Path Traversal Protection**
   - Filtrado de `..` y `/./` en rutas
   - Normalización de paths con `path.normalize()`
   - Validación de que los archivos se guarden dentro del directorio permitido

4. **Sanitización de nombres**
   - Conversión a lowercase
   - Reemplazo de caracteres especiales
   - Nombres únicos con UUID para evitar colisiones

5. **Validación de dimensiones (imágenes)**
   - Ancho y alto mínimo/máximo configurables
   - Previene subida de imágenes extremadamente grandes

### Ejemplo de configuración segura

```typescript
{
  fileType: FileType.IMAGE,
  maxSize: 2 * 1024 * 1024,        // Limitar tamaño
  minWidth: 100,                    // Dimensiones mínimas
  minHeight: 100,
  maxWidth: 5000,                   // Dimensiones máximas
  maxHeight: 5000,
}
```

---

## 🚀 Próximos Pasos

### Para empezar a usar:

1. **Configura las variables de entorno** en `.env`:
   ```bash
   UPLOADS_DIR=./uploads
   APP_URL=http://localhost:3001
   ```

2. **Prueba el módulo**:
   ```bash
   npm run files:test
   ```

3. **Implementa en tu controlador**:
   ```typescript
   @Post('upload')
   @FileUpload('file', FILE_UPLOAD_CONFIGS.USER_AVATAR)
   async upload(@UploadedFile() file: Express.Multer.File) {
     return await this.filesService.uploadFile({
       file,
       folder: 'uploads',
       validationOptions: FILE_UPLOAD_CONFIGS.USER_AVATAR,
     })
   }
   ```

### Extensibilidad

Para agregar soporte de almacenamiento en la nube (S3, Google Cloud Storage, etc.):

1. Implementa la interfaz `IStorageService`
2. Registra el nuevo servicio en `files.module.ts`
3. Cambia el provider `STORAGE_SERVICE` según el entorno

```typescript
// ejemplo: s3-storage.service.ts
@Injectable()
export class S3StorageService implements IStorageService {
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    // Implementación con AWS SDK
  }
  // ... otros métodos
}
```

---

## 📝 Ejemplos Completos

Ver ejemplos en:
- `src/@core/files/files.test.ts` - Testing manual
- `src/@core/files/files.service.spec.ts` - Tests unitarios
- `src/@core/files/services/local-storage.service.spec.ts` - Tests del storage

---

## 🐛 Troubleshooting

### Error: "UPLOADS_DIR no configurado"
**Solución**: Agrega `UPLOADS_DIR=./uploads` a tu `.env`

### Error: "Permission denied" al guardar archivos
**Solución**: Verifica permisos del directorio:
```bash
chmod 755 uploads/
```

### Archivos no se muestran en la web
**Solución**: Verifica que Express esté sirviendo archivos estáticos:
```typescript
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
})
```

---

## 📚 Referencias

- [Multer Documentation](https://github.com/expressjs/multer)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

---

**Desarrollado para Audit Core** 🎯
