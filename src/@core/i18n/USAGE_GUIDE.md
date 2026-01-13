# Guía de Uso: i18n vs Mensajes Manuales

## ❓ Tu Pregunta

> "En los schemas están los mensajes hechos manualmente, pero en i18n está la función que transforma... ¿cuál debo usar?"

## ✅ Respuesta: Usa SOLO i18n

Ya NO necesitas mensajes manuales. El sistema i18n los genera automáticamente.

---

## 📊 Comparación: ANTES vs DESPUÉS

### ❌ ANTES (Duplicado - NO hacer más)

```typescript
// 1. Archivo de constantes: user-schema.constants.ts
export const USER_CONSTRAINTS = {
  NAMES: { MIN: 2, MAX: 50 }
}

// ❌ Duplicación innecesaria
export const USER_VALIDATION_MESSAGES = {
  NAMES: {
    MIN: `Los nombres deben tener al menos ${USER_CONSTRAINTS.NAMES.MIN} caracteres`,
    MAX: `Los nombres no pueden exceder ${USER_CONSTRAINTS.NAMES.MAX} caracteres`,
  }
}
```

```typescript
// 2. En el DTO: create-user.dto.ts
import { MinLength } from 'class-validator'  // ❌ Importa de class-validator
import { USER_VALIDATION_MESSAGES } from '../constants'  // ❌ Importa mensajes manuales

@MinLength(USER_CONSTRAINTS.NAMES.MIN, {
  message: USER_VALIDATION_MESSAGES.NAMES.MIN  // ❌ Mensaje manual
})
names: string
```

**Problemas:**
- ❌ Duplicación: Mensajes en 2 lugares (constants + i18n)
- ❌ Mantenimiento: Cambiar un mensaje requiere editar múltiples archivos
- ❌ Inconsistencia: Mensajes pueden desincronizarse
- ❌ Código verbose: Más líneas de código

---

### ✅ DESPUÉS (Simple - Hacer esto)

```typescript
// 1. Archivo de constantes: user-schema.constants.ts
export const USER_CONSTRAINTS = {
  NAMES: { MIN: 2, MAX: 50 }
}

// ✅ Ya NO necesitas USER_VALIDATION_MESSAGES
// Los mensajes se generan automáticamente en i18n
```

```typescript
// 2. En el DTO: create-user.dto.ts
import { MinLength } from '@core/i18n'  // ✅ Importa de @core/i18n
import { USER_CONSTRAINTS } from '../constants'  // ✅ Solo constraints

@MinLength(USER_CONSTRAINTS.NAMES.MIN)  // ✅ Sin mensaje manual
names: string
// Auto-genera: "El campo nombres debe tener al menos 2 caracteres"
```

**Ventajas:**
- ✅ Sin duplicación: Mensajes en un solo lugar (i18n)
- ✅ Fácil mantenimiento: Cambiar mensajes en i18n afecta todo
- ✅ Consistencia: Todos los mensajes siguen el mismo formato
- ✅ Código limpio: Menos líneas de código
- ✅ Traducción automática: "names" → "nombres"

---

## 🎯 Regla Simple

### ¿Qué CONSERVAR?

✅ **USER_CONSTRAINTS** - Los VALORES numéricos
```typescript
export const USER_CONSTRAINTS = {
  NAMES: { MIN: 2, MAX: 50 },      // ✅ CONSERVAR
  EMAIL: { MAX: 100 },              // ✅ CONSERVAR
  USERNAME: {
    MIN: 3,
    MAX: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/      // ✅ CONSERVAR
  }
}
```

### ¿Qué ELIMINAR?

❌ **USER_VALIDATION_MESSAGES** - Los mensajes de texto
```typescript
// ❌ ELIMINAR - Ya no se necesita
export const USER_VALIDATION_MESSAGES = {
  NAMES: {
    MIN: 'Los nombres deben tener...',
    MAX: 'Los nombres no pueden...',
  }
}
```

---

## 🔧 Cómo Migrar

### Paso 1: Cambiar los imports

```typescript
// ❌ ANTES
import { IsString, MinLength, IsEmail } from 'class-validator'
import { USER_VALIDATION_MESSAGES } from '../constants'

// ✅ DESPUÉS
import { IsString, MinLength, IsEmail } from '@core/i18n'
// NO importar USER_VALIDATION_MESSAGES
```

### Paso 2: Eliminar mensajes manuales

```typescript
// ❌ ANTES
@MinLength(USER_CONSTRAINTS.NAMES.MIN, {
  message: USER_VALIDATION_MESSAGES.NAMES.MIN  // ❌ Eliminar
})
names: string

// ✅ DESPUÉS
@MinLength(USER_CONSTRAINTS.NAMES.MIN)  // ✅ Automático
names: string
```

### Paso 3: Verificar traducción

Si el campo NO está en `FIELD_NAMES`, agrégalo:

```typescript
// src/@core/i18n/constants/field-names.constants.ts
export const FIELD_NAMES = {
  names: 'nombres',        // ✅ Ya existe
  email: 'correo electrónico',  // ✅ Ya existe

  // Agregar nuevos si es necesario:
  myNewField: 'mi nuevo campo',
}
```

---

## 📝 Ejemplo Completo

### Archivo: `user-schema.constants.ts`

```typescript
/**
 * Solo define VALORES, NO mensajes
 */
export const USER_CONSTRAINTS = {
  NAMES: { MIN: 2, MAX: 50 },
  EMAIL: { MAX: 100 },
  USERNAME: {
    MIN: 3,
    MAX: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  }
} as const
```

### Archivo: `create-user.dto.ts`

```typescript
import { IsString, MinLength, MaxLength, IsEmail } from '@core/i18n'
import { USER_CONSTRAINTS } from '../constants/user-schema.constants'

export class CreateUserDto {
  @IsString()
  @MinLength(USER_CONSTRAINTS.NAMES.MIN)
  @MaxLength(USER_CONSTRAINTS.NAMES.MAX)
  names: string
  // ✅ Auto-genera 3 mensajes:
  // - "El campo nombres debe ser una cadena de texto"
  // - "El campo nombres debe tener al menos 2 caracteres"
  // - "El campo nombres debe tener máximo 50 caracteres"

  @IsEmail()
  @MaxLength(USER_CONSTRAINTS.EMAIL.MAX)
  email: string
  // ✅ Auto-genera:
  // - "El campo correo electrónico debe ser una dirección de correo electrónico válida"
  // - "El campo correo electrónico debe tener máximo 100 caracteres"

  @IsString()
  @MinLength(USER_CONSTRAINTS.USERNAME.MIN)
  @MaxLength(USER_CONSTRAINTS.USERNAME.MAX)
  @Matches(USER_CONSTRAINTS.USERNAME.PATTERN)
  username: string
  // ✅ Auto-genera:
  // - "El campo nombre de usuario debe ser una cadena de texto"
  // - "El campo nombre de usuario debe tener al menos 3 caracteres"
  // - "El campo nombre de usuario debe tener máximo 30 caracteres"
  // - "El campo nombre de usuario debe coincidir con el patrón /^[a-zA-Z0-9_]+$/"
}
```

---

## 🎨 Personalización (Opcional)

Si necesitas un mensaje ESPECÍFICO diferente al automático:

```typescript
// Opción 1: Mensaje completamente personalizado
@MinLength(10, {
  message: 'El código debe tener mínimo 10 dígitos para ser válido'
})
productCode: string

// Opción 2: Campo con nombre personalizado
@MinLength(10, { fieldName: 'código del producto' })
productCode: string
// Genera: "El campo código del producto debe tener al menos 10 caracteres"
```

**Pero en el 99% de los casos, el mensaje automático es suficiente.**

---

## ✨ Resumen

| Concepto | ¿Qué hacer? |
|----------|-------------|
| **USER_CONSTRAINTS** | ✅ Conservar y usar (valores numéricos, patrones) |
| **USER_VALIDATION_MESSAGES** | ❌ Eliminar (ya no se necesita) |
| **Imports** | ✅ Importar de `@core/i18n` en lugar de `class-validator` |
| **Mensajes** | ✅ Dejar que i18n los genere automáticamente |
| **Traducción de campos** | ✅ Agregar a `FIELD_NAMES` si es necesario |

---

## 🧪 Probar

```bash
# Probar el sistema i18n
npm run i18n:test translation

# Ver cómo los campos se traducen automáticamente
npm run i18n:test
```

---

## 💡 Conclusión

**SOLO necesitas 2 cosas:**

1. **`USER_CONSTRAINTS`** - Para los valores (MIN, MAX, PATTERN)
2. **Importar de `@core/i18n`** - Para validadores con mensajes automáticos

**YA NO necesitas:**
- ❌ `USER_VALIDATION_MESSAGES`
- ❌ Mensajes manuales en decoradores
- ❌ Importar de `class-validator`

El sistema i18n se encarga de TODO lo demás automáticamente. 🎉
