# Ejemplos de Uso del Sistema i18n

## Ejemplo 1: DTO Simple con Traducción Automática

```typescript
import { IsString, MinLength, MaxLength, IsEmail } from '@core/i18n'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  names: string

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastNames: string

  @IsEmail()
  @MaxLength(100)
  email: string
}
```

**Errores generados (en español con campos traducidos):**

```json
{
  "names": "El campo nombres debe tener al menos 2 caracteres",
  "email": "El campo correo electrónico debe ser una dirección de correo electrónico válida"
}
```

Nota: `names` → `nombres`, `email` → `correo electrónico` automáticamente.

---

## Ejemplo 2: Campo Personalizado con `fieldName`

```typescript
import { MinLength } from '@core/i18n'

export class UpdateProfileDto {
  @MinLength(10, { fieldName: 'nombre completo del usuario' })
  fullName: string
}
```

**Error generado:**

```json
{
  "fullName": "El campo nombre completo del usuario debe tener al menos 10 caracteres"
}
```

---

## Ejemplo 3: Transformers + Validadores

```typescript
import { IsBoolean, IsNumber, IsArray } from '@core/i18n'
import { ToBoolean, ToNumber, ToStringArray } from '@core/i18n'

export class ConfigDto {
  @ToBoolean()
  @IsBoolean()
  enabled: boolean
  // Input: "true" → true
  // Input: "1" → true
  // Input: "si" → true
  // Input: "no" → false

  @ToNumber()
  @IsNumber()
  maxRetries: number
  // Input: "42" → 42
  // Input: "3.14" → 3.14

  @ToStringArray()
  @IsArray()
  tags: string[]
  // Input: "tag1,tag2,tag3" → ["tag1", "tag2", "tag3"]
  // Input: "single" → ["single"]
}
```

---

## Ejemplo 4: Validación de Enums

```typescript
import { IsEnum, IsArray } from '@core/i18n'

export enum Role {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  CLIENTE = 'cliente',
}

export class AssignRolesDto {
  @IsArray()
  @IsEnum(Role, { each: true })
  roles: Role[]
}
```

**Error generado:**

```json
{
  "roles": "El campo roles debe ser un valor válido del enum"
}
```

---

## Ejemplo 5: Validación de UUIDs y Relaciones

```typescript
import { IsUUID, IsOptional } from '@core/i18n'

export class CreateStandardDto {
  @IsUUID('4')
  templateId: string
  // Error: "El campo ID de plantilla debe ser un UUID válido"

  @IsOptional()
  @IsUUID('4')
  parentId?: string
  // Error: "El campo parentId debe ser un UUID válido"
}
```

**Agregar traducción de `parentId`:**

En `src/@core/i18n/constants/field-names.constants.ts`:

```typescript
export const FIELD_NAMES = {
  // ... campos existentes
  parentId: 'ID del padre',
}
```

Ahora el error será:

```json
{
  "parentId": "El campo ID del padre debe ser un UUID válido"
}
```

---

## Ejemplo 6: Validación de Strings con Patterns

```typescript
import { IsString, Matches, MinLength, MaxLength } from '@core/i18n'

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El campo nombre de usuario solo puede contener letras, números y guión bajo',
  })
  username: string
}
```

**Error generado:**

```json
{
  "username": "El campo nombre de usuario solo puede contener letras, números y guión bajo"
}
```

Nota: Puedes sobrescribir el mensaje con la opción `message` si necesitas uno personalizado.

---

## Ejemplo 7: Validación de Arrays con Tamaño

```typescript
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from '@core/i18n'

export class CreateTemplateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags: string[]
}
```

**Errores generados:**

```json
{
  "tags": "El campo tags debe tener al menos 1 elementos"
}
```

---

## Ejemplo 8: Validación Condicional

```typescript
import { ValidateIf, IsString, MinLength } from '@core/i18n'

export class UpdateUserDto {
  @ValidateIf((obj) => obj.password !== undefined)
  @IsString()
  @MinLength(8)
  password?: string

  @ValidateIf((obj) => obj.password !== undefined)
  @IsString()
  @MinLength(8)
  confirmPassword?: string
}
```

---

## Ejemplo 9: Validación de Números con Rangos

```typescript
import { IsNumber, Min, Max, IsPositive } from '@core/i18n'
import { ToNumber } from '@core/i18n'

export class CreateEvaluationDto {
  @ToNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number
  // Error: "El campo score debe ser mayor o igual a 0"
  // Error: "El campo score debe ser menor o igual a 100"

  @ToNumber()
  @IsPositive()
  weight: number
  // Error: "El campo weight debe ser un número positivo"
}
```

**Agregar traducciones:**

```typescript
// field-names.constants.ts
export const FIELD_NAMES = {
  // ... campos existentes
  score: 'puntuación',
  weight: 'peso',
}
```

**Errores con traducción:**

```json
{
  "score": "El campo puntuación debe ser mayor o igual a 0",
  "weight": "El campo peso debe ser un número positivo"
}
```

---

## Ejemplo 10: Validación de Fechas

```typescript
import { IsDate, MinDate, MaxDate } from '@core/i18n'
import { ToUtcDate } from '@core/i18n'

export class CreateEventDto {
  @ToUtcDate()
  @IsDate()
  @MinDate(new Date())
  startDate: Date
  // Error: "El campo startDate debe ser una fecha posterior o igual a 13/1/2026"

  @ToUtcDate()
  @IsDate()
  endDate: Date
}
```

---

## Comparación: Antes vs Después

### Antes (sin i18n)

```typescript
import { IsString, MinLength, IsEmail } from 'class-validator'

export class CreateUserDto {
  @IsString({ message: 'El campo nombres debe ser una cadena de texto' })
  @MinLength(2, { message: 'El campo nombres debe tener al menos 2 caracteres' })
  names: string

  @IsEmail({}, { message: 'El campo correo electrónico debe ser válido' })
  email: string
}
```

**Problemas:**
- ❌ Mensajes manuales en cada decorador
- ❌ Duplicación de "El campo nombres" en cada mensaje
- ❌ Traducción manual de field names
- ❌ Difícil de mantener
- ❌ Inconsistente entre DTOs

### Después (con i18n)

```typescript
import { IsString, MinLength, IsEmail } from '@core/i18n'

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  names: string

  @IsEmail()
  email: string
}
```

**Ventajas:**
- ✅ Mensajes automáticos en español
- ✅ Traducción automática de campos (names → nombres)
- ✅ Sin duplicación
- ✅ Fácil de mantener
- ✅ Consistente en todo el proyecto

---

## Workflow de Desarrollo

### 1. Crear DTO con validadores

```typescript
import { IsString, MinLength } from '@core/i18n'

export class CreateDto {
  @IsString()
  @MinLength(2)
  newField: string
}
```

### 2. Probar y ver error en inglés

```json
{
  "newField": "El campo newField debe tener al menos 2 caracteres"
}
```

### 3. Agregar traducción (opcional)

```typescript
// field-names.constants.ts
export const FIELD_NAMES = {
  // ... campos existentes
  newField: 'nuevo campo',
}
```

### 4. Error ahora en español completo

```json
{
  "newField": "El campo nuevo campo debe tener al menos 2 caracteres"
}
```

---

## Tips

1. **Usa transformers antes de validadores:**
   ```typescript
   @ToNumber()     // Primero transforma
   @IsNumber()     // Luego valida
   score: number
   ```

2. **Agrega traducciones gradualmente:**
   - No es necesario agregar todos los campos a `FIELD_NAMES` de inmediato
   - El sistema usa el nombre original si no encuentra traducción
   - Agrega traducciones cuando sea necesario para mejorar UX

3. **Sobrescribe mensajes cuando sea necesario:**
   ```typescript
   @Matches(/^[A-Z]+$/, {
     message: 'Solo se permiten letras mayúsculas'
   })
   code: string
   ```

4. **Usa `fieldName` para casos especiales:**
   ```typescript
   @MinLength(2, { fieldName: 'código del producto' })
   productCode: string
   ```
