# Sistema i18n - Validación en Español

Sistema simplificado de internacionalización para class-validator con mensajes en español y traducción automática de nombres de campos.

## Características

✅ **Traducción automática de campos**: `names` → `nombres`, `email` → `correo electrónico`
✅ **Mensajes en español**: Todos los validadores de class-validator
✅ **Transformers personalizados**: ToBoolean, ToNumber, ToArray, etc.
✅ **Simple y mantenible**: Una sola función factory en lugar de 5
✅ **Type-safe**: TypeScript completo
✅ **Single Source of Truth**: Diccionario centralizado de traducciones

## 🧪 Testing Interactivo

Prueba el sistema i18n con la herramienta de testing interactiva:

```bash
# Probar todos los escenarios
npm run i18n:test

# Ver ayuda
npm run i18n:test help

# Probar escenarios específicos
npm run i18n:test translation      # Traducción automática
npm run i18n:test transformers     # Transformers de datos
npm run i18n:test enums            # Validación de enums/UUIDs
npm run i18n:test custom-field     # Nombres personalizados
npm run i18n:test numbers          # Validaciones numéricas
npm run i18n:test patterns         # Validación con regex
```

**Ejemplo de salida:**

```
══════════════════════════════════════════════════════════════════════
  🌐 Traducción Automática de Campos
  Demuestra cómo los nombres de campos se traducen automáticamente
══════════════════════════════════════════════════════════════════════

  📝 Escenario: Datos inválidos

  ⚠ Errores encontrados: 4
    ✖ El campo nombres debe tener al menos 2 caracteres
    ✖ El campo apellidos debe tener al menos 2 caracteres
    ✖ El campo correo electrónico debe ser una dirección de correo electrónico válida
    ✖ El campo nombre de usuario debe tener al menos 3 caracteres
```

## Estructura

```
src/@core/i18n/
├── constants/
│   ├── field-names.constants.ts    # Diccionario de traducciones (names → nombres)
│   └── messages.constants.ts       # Mensajes en español (ValidationMessageEnum)
├── helpers/
│   └── create-validator.helper.ts  # Función factory universal
├── transformers/
│   └── index.ts                    # Transformers personalizados
├── index.ts                        # Exporta todos los validadores
└── README.md                       # Esta documentación
```

## Uso Básico

### 1. Importar desde @core/i18n en lugar de class-validator

```typescript
// ❌ NO hacer esto
import { IsString, MinLength, IsEmail } from 'class-validator'

// ✅ Hacer esto
import { IsString, MinLength, IsEmail } from '@core/i18n'
```

### 2. Usar normalmente en DTOs

```typescript
import { IsString, MinLength, MaxLength, IsEmail } from '@core/i18n'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  names: string
  // Error: "El campo nombres debe tener al menos 2 caracteres"
  // Nota: "names" se traduce automáticamente a "nombres"

  @IsEmail()
  @MaxLength(100)
  email: string
  // Error: "El campo correo electrónico debe ser una dirección de correo electrónico válida"
  // Nota: "email" se traduce automáticamente a "correo electrónico"
}
```

## Traducción Automática de Campos

El sistema busca automáticamente la traducción del nombre del campo en `FIELD_NAMES`:

```typescript
// src/@core/i18n/constants/field-names.constants.ts
export const FIELD_NAMES = {
  names: 'nombres',
  lastNames: 'apellidos',
  email: 'correo electrónico',
  username: 'nombre de usuario',
  // ... más traducciones
}
```

**Agregar nuevas traducciones:**

Simplemente agrega el campo al diccionario:

```typescript
export const FIELD_NAMES = {
  // ... campos existentes

  // Nuevos campos
  phoneNumber: 'número de teléfono',
  birthDate: 'fecha de nacimiento',
  companyName: 'nombre de la empresa',
}
```

## Nombre de Campo Personalizado

Si necesitas un nombre específico que no está en el diccionario:

```typescript
export class UpdateProfileDto {
  @MinLength(10, { fieldName: 'nombre completo' })
  fullName: string
  // Error: "El campo nombre completo debe tener al menos 10 caracteres"
}
```

## Transformers Personalizados

Importa transformers para conversión automática de valores:

```typescript
import { IsBoolean, IsNumber } from '@core/i18n'
import { ToBoolean, ToNumber, ToArray } from '@core/i18n'

export class ConfigDto {
  @ToBoolean()
  @IsBoolean()
  enabled: boolean
  // Convierte "true", "1", "yes", "si" → true

  @ToNumber()
  @IsNumber()
  maxRetries: number
  // Convierte "42" → 42

  @ToArray()
  tags: string[]
  // Convierte "tag1,tag2,tag3" → ["tag1", "tag2", "tag3"]
}
```

### Transformers Disponibles

| Transformer | Descripción |
|------------|-------------|
| `ToUtcDate()` | Convierte a fecha UTC |
| `ToUtcDateString()` | Convierte a string ISO UTC |
| `ToBoolean()` | Convierte strings/números a boolean |
| `ToNumber()` | Convierte strings a números |
| `ToLowerCase()` | Convierte a minúsculas |
| `ToUpperCase()` | Convierte a mayúsculas |
| `Trim()` | Elimina espacios en blanco |
| `ToArray()` | Convierte strings separados por comas a arrays |
| `ToStringArray()` | Convierte a array de strings |
| `ToNumberArray()` | Convierte a array de números |

## Validadores Disponibles

Todos los validadores de class-validator están disponibles con mensajes en español:

### Validadores Comunes
- `IsDefined`, `IsOptional`, `IsEmpty`, `IsNotEmpty`
- `Equals`, `NotEquals`, `IsIn`, `IsNotIn`

### Validadores de Tipo
- `IsBoolean`, `IsDate`, `IsString`, `IsNumber`, `IsInt`
- `IsArray`, `IsEnum`, `IsObject`

### Validadores Numéricos
- `Min`, `Max`, `IsPositive`, `IsNegative`
- `IsDivisibleBy`

### Validadores de String
- `MinLength`, `MaxLength`, `Length`
- `IsEmail`, `IsUrl`, `IsUUID`, `IsJWT`
- `IsAlpha`, `IsAlphanumeric`, `IsHexadecimal`
- `Matches`, `Contains`, `NotContains`
- `IsLowercase`, `IsUppercase`

### Validadores de Array
- `ArrayNotEmpty`, `ArrayMinSize`, `ArrayMaxSize`
- `ArrayContains`, `ArrayNotContains`, `ArrayUnique`

### Validadores de Fecha
- `MinDate`, `MaxDate`

## Ejemplo Completo

```typescript
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUUID,
} from '@core/i18n'
import { ToLowerCase, Trim } from '@core/i18n'
import { Role } from '../entities/user.entity'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  names: string
  // Error: "El campo nombres debe tener al menos 2 caracteres"

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastNames: string
  // Error: "El campo apellidos debe tener al menos 2 caracteres"

  @Trim()
  @ToLowerCase()
  @IsEmail()
  @MaxLength(100)
  email: string
  // Convierte a minúsculas y valida
  // Error: "El campo correo electrónico debe ser una dirección de correo electrónico válida"

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string
  // Error: "El campo teléfono debe tener máximo 20 caracteres"

  @IsUUID('4')
  organizationId: string
  // Error: "El campo ID de organización debe ser un UUID válido"

  @IsEnum(Role, { each: true })
  roles: Role[]
  // Error: "El campo roles debe ser un valor válido del enum"
}
```

## Comparación: Antes vs Después

### Antes (960 líneas, complejo)

```typescript
// 5 factory functions diferentes
makeSimple()
makeWithOptionalOptions()
makeWithRequiredOptions()
makeWithTwoOptions()
makeSpecialCase()

// Detección compleja de tipos
isValidationOptions()

// Wrapping manual de cada decorador
export const IsAlpha = makeWithOptionalOptions<{
  locale?: ValidatorJS.AlphaLocale
}>((options, validationOptions) => {
  const locale = options?.locale || 'en-US'
  return validator.IsAlpha(locale, validationOptions)
}, ValidationMessageEnum.IS_ALPHA)

// Sin traducción automática de campos
@MinLength(2, { fieldName: 'nombres' })  // Manual
```

### Después (~416 líneas, simple)

```typescript
// UNA sola función factory universal
createValidator()

// Wrapping simple de cada decorador
export const IsAlpha = createValidator(
  validator.IsAlpha,
  ValidationMessageEnum.IS_ALPHA,
)

// Traducción automática de campos
@MinLength(2)  // "names" → "nombres" automáticamente
```

## Mejoras Implementadas

1. **Reducción de complejidad**: De 960 a ~416 líneas totales
2. **Una sola factory**: En lugar de 5 funciones diferentes
3. **Traducción automática**: Diccionario centralizado en `FIELD_NAMES`
4. **Mejor organización**: Separación en constants/, helpers/, transformers/
5. **Type-safe**: Mejor tipado con TypeScript
6. **Mantenible**: Agregar nuevos campos es trivial
7. **Consistente**: Sigue el patrón del proyecto (como `USER_CONSTRAINTS`)

## Mantenimiento

### Agregar nueva traducción de campo

Edita `constants/field-names.constants.ts`:

```typescript
export const FIELD_NAMES = {
  // ... campos existentes
  newField: 'nuevo campo',
}
```

### Agregar nuevo mensaje de validación

1. Edita `constants/messages.constants.ts`:
```typescript
export enum ValidationMessageEnum {
  // ... mensajes existentes
  NEW_VALIDATOR = 'El campo {{field}} debe cumplir X condición',
}
```

2. Exporta el validador en `index.ts`:
```typescript
export const NewValidator = createValidator(
  validator.NewValidator,
  ValidationMessageEnum.NEW_VALIDATOR,
)
```

## Migración

Para migrar código existente:

1. Buscar y reemplazar imports:
   ```typescript
   // Antes
   import { IsString, IsEmail } from 'class-validator'

   // Después
   import { IsString, IsEmail } from '@core/i18n'
   ```

2. Agregar traducciones de campos personalizados a `FIELD_NAMES`

3. Remover opciones `{ message: '...' }` manuales (ya no necesarias)

¡Listo! El sistema aplicará automáticamente mensajes en español con nombres de campos traducidos.
