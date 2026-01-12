# ✅ Verificación - Sistema de Archivos

Guía paso a paso para verificar que el sistema de archivos está funcionando correctamente.

---

## 📋 Checklist de Verificación

### ✅ **Paso 1: Verificar Configuración**

1. **Revisa tu `.env`:**
   ```bash
   UPLOADS_DIR=./uploads
   APP_URL=http://localhost:3001
   ```

2. **Verifica que la carpeta uploads existe:**
   ```bash
   ls -la uploads/
   ```
   Si no existe, créala:
   ```bash
   mkdir uploads
   chmod 755 uploads
   ```

---

### ✅ **Paso 2: Ejecutar Test Automático**

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

✓ Completado: 9 exitosos, 0 errores
```

---

### ✅ **Paso 3: Verificar Archivos Físicos**

Los archivos de prueba deben estar en el sistema de archivos:

```bash
# Ver archivos creados
ls -la uploads/test-uploads/

# Deberías ver archivos como:
# -rw-r--r-- 1 user user  70 Jan 11 19:44 test-image-abc123.jpg
# -rw-r--r-- 1 user user 200 Jan 11 19:44 test-document-xyz789.pdf
```

---

### ✅ **Paso 4: Iniciar la Aplicación**

```bash
npm run start:dev
```

**Busca estos mensajes en los logs:**
```
[http] 📁 Archivos estáticos servidos desde: /ruta/a/tu/proyecto/uploads
[http] 🌐 URL de acceso: http://localhost:3001/uploads/
[http] 🔓 CORS habilitado para: *
```

Si ves estos mensajes, la configuración de archivos estáticos está activa ✅

---

### ✅ **Paso 5: Subir un Archivo de Prueba**

Con la aplicación corriendo, ejecuta:

```bash
npm run files:test upload image
```

**Copia la URL que aparece en el resultado**, por ejemplo:
```
URL: http://localhost:3001/uploads/test-uploads/abc-123.jpg
```

---

### ✅ **Paso 6: Acceder al Archivo desde el Navegador**

1. **Abre tu navegador**
2. **Pega la URL** del paso anterior
3. **Deberías ver la imagen** (un pixel rojo 1x1)

**Si ves la imagen → ✅ ¡El sistema funciona correctamente!**

**Si ves error 404 → ⚠️ Archivos estáticos no están configurados**

---

## 🧪 Pruebas Adicionales

### Probar con cURL

```bash
# 1. Subir un archivo
npm run files:test upload image

# 2. Copiar la URL generada (ejemplo)
# http://localhost:3001/uploads/test-uploads/abc-123.jpg

# 3. Probar con curl
curl -I http://localhost:3001/uploads/test-uploads/abc-123.jpg

# Resultado esperado:
# HTTP/1.1 200 OK
# Content-Type: image/jpeg
# Content-Length: 70
```

### Probar desde Frontend

```javascript
// Ejemplo React/Vue/Angular
<img src="http://localhost:3001/uploads/test-uploads/abc-123.jpg" alt="Test" />

// O con fetch
fetch('http://localhost:3001/uploads/test-uploads/abc-123.jpg')
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob)
    console.log('✅ Archivo accesible:', url)
  })
```

---

## 🐛 Problemas Comunes

### ❌ Error 404: Not Found

**Síntoma:**
```
Cannot GET /uploads/test-uploads/abc-123.jpg
```

**Causas posibles:**

1. **Archivos estáticos no configurados en `main.ts`**

   Verifica que tienes esto en `src/main.ts`:
   ```typescript
   const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads')
   app.useStaticAssets(uploadsDir, {
     prefix: '/uploads/',
     index: false,
   })
   ```

2. **La carpeta uploads no existe**
   ```bash
   mkdir -p uploads/test-uploads
   chmod -R 755 uploads
   ```

3. **El archivo no fue subido correctamente**
   ```bash
   # Verificar que el archivo existe
   ls -la uploads/test-uploads/
   ```

4. **Reinicia la aplicación**
   ```bash
   # Detener (Ctrl+C)
   # Volver a iniciar
   npm run start:dev
   ```

---

### ❌ CORS Error desde Frontend

**Síntoma:**
```
Access to fetch at 'http://localhost:3001/uploads/...' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Solución:**

1. Verifica tu configuración de CORS en `.env`:
   ```bash
   CORS_ORIGIN=http://localhost:3000
   # O para permitir todos:
   CORS_ORIGIN=*
   ```

2. Verifica que CORS esté habilitado en `main.ts`:
   ```typescript
   app.enableCors({
     origin: corsOrigin,
     credentials: true,
   })
   ```

3. Reinicia la aplicación

---

### ❌ Permission Denied

**Síntoma:**
```
Error: EACCES: permission denied, mkdir 'uploads'
```

**Solución:**
```bash
# Dar permisos a la carpeta
chmod -R 755 uploads/

# O crear manualmente con permisos
mkdir -p uploads
chmod 755 uploads
```

---

### ❌ Path Traversal Detected

**Síntoma:**
```
Error: Invalid path: ../ detected
```

**Esto es normal** → El sistema está protegiendo contra ataques de path traversal. No uses `../` en las rutas de carpetas.

---

## ✨ Verificación Completa Exitosa

Si todos estos pasos funcionan:

✅ Configuración en `.env` correcta
✅ Test automático pasa (9/9 exitosos)
✅ Archivos físicos se crean en `uploads/`
✅ Aplicación muestra logs de archivos estáticos
✅ URL funciona en el navegador
✅ cURL devuelve 200 OK

**→ ¡El sistema está 100% funcional!** 🎉

---

## 📊 Checklist Final

```
[ ] Variables en .env configuradas
[ ] Carpeta uploads existe con permisos 755
[ ] npm run files:test pasa exitosamente
[ ] Aplicación muestra logs de archivos estáticos
[ ] URL funciona en navegador
[ ] CORS configurado correctamente
[ ] Frontend puede acceder a los archivos
```

---

## 🚀 Próximos Pasos

Una vez verificado que todo funciona:

1. **Implementa tu primer endpoint** de subida de archivos
2. **Usa las configuraciones predefinidas** (`FILE_UPLOAD_CONFIGS`)
3. **Integra con tu frontend**
4. **Escribe tests** para tus implementaciones

---

## 🆘 ¿Necesitas Ayuda?

Si después de seguir todos estos pasos aún tienes problemas:

1. Verifica los logs completos de la aplicación
2. Revisa que todas las dependencias estén instaladas: `npm install`
3. Limpia y reconstruye: `npm run build`
4. Verifica que el puerto 3001 no esté ocupado: `lsof -i :3001`

---

**Última actualización:** 2026-01-11
