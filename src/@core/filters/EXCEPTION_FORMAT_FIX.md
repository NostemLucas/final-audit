# Corrección del Formato de Excepciones

## Problemas Resueltos

### 1. ❌ Comillas Escapadas en Mensajes

**Problema:**
Los mensajes de error contenían comillas dobles (`"`) que se escapaban al serializar a JSON:

```json
{
  "message": "El email \"juan.perez@example.com\" ya está registrado"
}
```

**Causa:**
```typescript
// ❌ ANTES: Comillas dobles se escapan en JSON
super(`El email "${email}" ya está registrado`)
```

**Solución:**
```typescript
// ✅ AHORA: Comillas simples NO se escapan
super(`El email '${email}' ya está registrado`)
```

**Resultado:**
```json
{
  "message": "El email 'juan.perez@example.com' ya está registrado"
}
```

---

### 2. ❌ Duplicación en el Campo `details`

**Problema:**
El campo `details` contenía TODA la respuesta, duplicando `message`, `error` y `statusCode`:

```json
{
  "statusCode": 409,
  "message": "El email 'juan.perez@example.com' ya está registrado",
  "error": "Conflict",
  "details": {
    "message": "El email 'juan.perez@example.com' ya está registrado",  // ← Duplicado
    "error": "Conflict",                                                // ← Duplicado
    "statusCode": 409                                                   // ← Duplicado
  }
}
```

**Causa:**
```typescript
// ❌ ANTES: Pasaba TODO el responseObj a details
details: process.env.NODE_ENV !== 'production' ? responseObj : undefined
```

**Solución:**
```typescript
// ✅ AHORA: Solo pasa información ADICIONAL (sin duplicar)
const { message, error, statusCode: _, ...additionalInfo } = responseObj
const hasAdditionalInfo = Object.keys(additionalInfo).length > 0

details: process.env.NODE_ENV !== 'production' && hasAdditionalInfo
  ? additionalInfo
  : undefined
```

**Resultado:**
```json
{
  "statusCode": 409,
  "message": "El email 'juan.perez@example.com' ya está registrado",
  "error": "Conflict"
  // ← "details" NO aparece si no hay información adicional
}
```

---

## Ejemplos de Excepciones Antes/Después

### Ejemplo 1: EmailAlreadyExistsException

**❌ ANTES:**
```json
{
  "statusCode": 409,
  "timestamp": "2026-01-14T04:15:07.923Z",
  "path": "/users",
  "method": "POST",
  "message": "El email \"juan.perez@example.com\" ya está registrado",
  "error": "Conflict",
  "details": {
    "message": "El email \"juan.perez@example.com\" ya está registrado",
    "error": "Conflict",
    "statusCode": 409
  }
}
```

**✅ AHORA:**
```json
{
  "statusCode": 409,
  "timestamp": "2026-01-14T04:15:07.923Z",
  "path": "/users",
  "method": "POST",
  "message": "El email 'juan.perez@example.com' ya está registrado",
  "error": "Conflict"
}
```

---

### Ejemplo 2: UserNotFoundException

**❌ ANTES:**
```json
{
  "statusCode": 404,
  "message": "Usuario no encontrado con Email: \"juan@example.com\"",
  "error": "Not Found"
}
```

**✅ AHORA:**
```json
{
  "statusCode": 404,
  "message": "Usuario no encontrado con Email: 'juan@example.com'",
  "error": "Not Found"
}
```

---

### Ejemplo 3: Excepción con Información Adicional

Si una excepción personalizada incluye DATOS ADICIONALES (más allá de message/error/statusCode), SÍ aparecerán en `details`:

```typescript
// Excepción personalizada con datos adicionales
throw new HttpException({
  message: 'Validation failed',
  error: 'Bad Request',
  statusCode: 400,
  validationErrors: [  // ← Información adicional
    { field: 'email', error: 'Invalid format' },
    { field: 'age', error: 'Must be positive' },
  ]
}, 400)
```

**Resultado:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "validationErrors": [  // ← SOLO la información adicional
      { "field": "email", "error": "Invalid format" },
      { "field": "age", "error": "Must be positive" }
    ]
  }
}
```

---

## Archivos Modificados

### 1. HttpExceptionFilter (`src/@core/filters/http-exception.filter.ts`)

**Cambio en el método `parseException()`:**

```typescript
// Extraer solo información adicional para details (no duplicar)
const { message, error, statusCode: _, ...additionalInfo } = responseObj
const hasAdditionalInfo = Object.keys(additionalInfo).length > 0

return {
  statusCode: status,
  message: (responseObj.message as string | string[]) || exception.message,
  error: (responseObj.error as string) || exception.name,
  details:
    process.env.NODE_ENV !== 'production' && hasAdditionalInfo
      ? additionalInfo   // ← Solo datos adicionales
      : undefined,
}
```

### 2. Excepciones Personalizadas (8 archivos)

**Archivos modificados:**
- `src/modules/users/exceptions/email-already-exists.exception.ts`
- `src/modules/users/exceptions/ci-already-exists.exception.ts`
- `src/modules/users/exceptions/username-already-exists.exception.ts`
- `src/modules/users/exceptions/user-not-found.exception.ts`
- `src/modules/organizations/exceptions/name-already-exists.exception.ts`
- `src/modules/organizations/exceptions/nit-already-exists.exception.ts`
- `src/modules/templates/exceptions/template-already-exists.exception.ts`
- `src/modules/templates/exceptions/template-not-editable.exception.ts`

**Cambio aplicado:**
```typescript
// ❌ ANTES
super(`El email "${email}" ya está registrado`)

// ✅ AHORA
super(`El email '${email}' ya está registrado`)
```

---

## Mejoras en la Experiencia del Usuario

1. **Mensajes Más Limpios:**
   - Las comillas simples son más legibles que `\"`
   - No hay caracteres escapados innecesarios

2. **Respuestas Más Pequeñas:**
   - Sin duplicación, el payload es ~30% más pequeño
   - Menos ancho de banda usado

3. **Debugging Más Fácil:**
   - `details` solo contiene información REALMENTE adicional
   - No hay que filtrar datos duplicados mentalmente

4. **Consistencia:**
   - Todas las excepciones ahora siguen el mismo patrón
   - Formato predecible para el frontend

---

## Testing

Para verificar los cambios:

```bash
# 1. Build exitoso
npm run build ✅

# 2. Prueba de excepción con email duplicado
POST /users
{
  "email": "existing@example.com",
  "username": "test"
}

# Respuesta esperada:
{
  "statusCode": 409,
  "timestamp": "2026-01-14T05:00:00.000Z",
  "path": "/users",
  "method": "POST",
  "message": "El email 'existing@example.com' ya está registrado",
  "error": "Conflict"
}
✅ Sin comillas escapadas
✅ Sin campo "details"
```

---

## Notas Importantes

1. **`details` Solo en Desarrollo:**
   ```typescript
   process.env.NODE_ENV !== 'production' && hasAdditionalInfo
   ```
   En producción, `details` NUNCA aparece (por seguridad)

2. **Comillas Simples vs Dobles:**
   - JSON siempre usa comillas dobles para las claves y valores string
   - Pero dentro del CONTENIDO del string, usar comillas simples evita el escape

3. **Backwards Compatible:**
   - Los códigos de error (`statusCode`) no cambiaron
   - Los nombres de error (`error`) no cambiaron
   - Solo mejoró el formato del mensaje

---

## Conclusión

✅ **Problema de comillas escapadas:** Resuelto (8 excepciones corregidas)
✅ **Problema de duplicación:** Resuelto (filtro mejorado)
✅ **Mensajes más limpios:** Sí
✅ **Respuestas más pequeñas:** Sí (~30% reducción)
✅ **Backwards compatible:** Sí
