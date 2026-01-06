# 📦 Guía de Barrel Exports (index.ts)

Esta guía explica **qué exponer y qué NO exponer** en los archivos `index.ts` de cada módulo.

---

## 🎯 Regla de Oro

**Un barrel export (index.ts) define la API PÚBLICA de un módulo o carpeta.**

- ✅ **EXPONER**: Lo que otros módulos NECESITAN
- ❌ **NO EXPONER**: Detalles de implementación interna

---

## 📚 Tipos de index.ts

### 1️⃣ Index.ts de CARPETAS INTERNAS

**Ubicación**: `dtos/index.ts`, `entities/index.ts`, `exceptions/index.ts`

**Regla**: Exporta TODO de esa carpeta (para conveniencia interna del módulo)

```typescript
// ✅ src/modules/users/dtos/index.ts
export * from './create-user.dto'
export * from './update-user.dto'

// ✅ src/modules/users/entities/index.ts
export * from './user.entity'

// ✅ src/modules/users/exceptions/index.ts
export * from './user-not-found.exception'
export * from './email-already-exists.exception'
export * from './username-already-exists.exception'
export * from './ci-already-exists.exception'
```

### 2️⃣ Index.ts de IMPLEMENTACIÓN PRIVADA

**Ubicación**: `repositories/index.ts`, `factories/index.ts`, `validators/index.ts`

**Regla**: Exporta para uso INTERNO del módulo, pero NO en el index.ts raíz

```typescript
// ✅ src/modules/users/repositories/index.ts
// Exports internos del módulo - NO exponer en index.ts raíz
export * from './users.repository'
export * from './users-repository.interface'

// Symbol token para Dependency Injection
export const USERS_REPOSITORY = Symbol('IUsersRepository')
```

```typescript
// ✅ src/modules/users/factories/index.ts
// Exports internos del módulo - NO exponer en index.ts raíz
export * from './user.factory'
```

```typescript
// ✅ src/modules/users/validators/index.ts
// Exports internos del módulo - NO exponer en index.ts raíz
export * from './user.validator'
```

### 3️⃣ Index.ts de CONTROLLERS

**Ubicación**: `controllers/index.ts`

**Regla**: Opcional (NestJS los maneja automáticamente). Si existe, NO exponer en raíz.

```typescript
// ✅ src/modules/users/controllers/index.ts
// Controllers NO necesitan index.ts (NestJS los maneja automáticamente)
// Pero si existe, no lo exponemos en el index.ts raíz
export * from './users.controller'
```

### 4️⃣ Index.ts RAÍZ del Módulo (API PÚBLICA)

**Ubicación**: `src/modules/users/index.ts`

**Regla**: Exporta SOLO lo que otros módulos necesitan (API Pública)

```typescript
/**
 * API Pública del módulo Users
 *
 * ✅ EXPONER: Module, Entity, DTOs, Service, Exceptions
 * ❌ NO EXPONER: Repository, Factory, Validator, Controller
 */

// 1. Module (SIEMPRE - para importar en AppModule)
export * from './users.module'

// 2. Entity (para tipos en otros módulos)
export * from './entities/user.entity'

// 3. DTOs (si otros módulos los usan - ej: auth module)
export * from './dtos'

// 4. Service (si otros módulos lo necesitan - ej: auth module)
export * from './services/users.service'

// 5. Exceptions (para manejo de errores en otros módulos)
export * from './exceptions'

// ❌ NO exportar:
// - Repository (implementación privada del módulo)
// - Factory (implementación privada del módulo)
// - Validator (implementación privada del módulo)
// - Controller (NestJS lo maneja automáticamente)
```

---

## ✅ ¿QUÉ EXPONER en el Index.ts Raíz?

| Item | ¿Exponer? | Razón |
|------|-----------|-------|
| **Module** | ✅ SÍ | AppModule lo necesita |
| **Entity** | ✅ SÍ | Otros módulos necesitan el tipo (relaciones, imports) |
| **DTOs** | ✅ SÍ | Otros módulos pueden usarlos (ej: auth usa CreateUserDto) |
| **Service** | ✅ SÍ | Otros módulos pueden inyectarlo |
| **Exceptions** | ✅ SÍ | Otros módulos pueden atraparlas y manejarlas |
| **Enums/Types** | ✅ SÍ | Si están en la Entity, se exportan automáticamente |
| **Repository** | ❌ NO | Implementación privada (solo el módulo lo usa) |
| **Factory** | ❌ NO | Implementación privada (solo el service lo usa) |
| **Validator** | ❌ NO | Implementación privada (solo el service lo usa) |
| **Controller** | ❌ NO | NestJS lo registra automáticamente |
| **Symbol Token** | ❌ NO | Solo para uso interno en providers |

---

## 🎨 Estructura Visual

```
src/modules/users/
├── controllers/
│   ├── users.controller.ts
│   └── index.ts ────────────► (Opcional) export * - NO exponer en raíz
│
├── dtos/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── index.ts ────────────► export * - SÍ exponer en raíz
│
├── entities/
│   ├── user.entity.ts
│   └── index.ts ────────────► export * - SÍ exponer en raíz
│
├── exceptions/
│   ├── user-not-found.exception.ts
│   ├── email-already-exists.exception.ts
│   └── index.ts ────────────► export * - SÍ exponer en raíz
│
├── factories/
│   ├── user.factory.ts
│   └── index.ts ────────────► export * - NO exponer en raíz ❌
│
├── repositories/
│   ├── users.repository.ts
│   ├── users-repository.interface.ts
│   └── index.ts ────────────► export * + Symbol - NO exponer en raíz ❌
│
├── validators/
│   ├── user.validator.ts
│   └── index.ts ────────────► export * - NO exponer en raíz ❌
│
├── services/
│   ├── users.service.ts
│   └── index.ts ────────────► export * - SÍ exponer en raíz
│
├── users.module.ts
└── index.ts ────────────────► API PÚBLICA (5 exports)
    ├── ✅ Module
    ├── ✅ Entity
    ├── ✅ DTOs
    ├── ✅ Service
    └── ✅ Exceptions
```

---

## 📖 Ejemplos de Uso

### ✅ CORRECTO - Import desde API pública

```typescript
// ✅ app.module.ts
import { UsersModule } from './modules/users'

// ✅ auth.service.ts
import { UsersService, CreateUserDto } from './modules/users'

// ✅ organizations.entity.ts
import { UserEntity } from './modules/users'

// ✅ global exception filter
import { UserNotFoundException } from './modules/users'
```

### ❌ INCORRECTO - Import de implementación privada

```typescript
// ❌ MAL - No deberías poder hacer esto
import { UserFactory } from './modules/users' // ❌ No exportado

// ❌ MAL - No deberías poder hacer esto
import { UsersRepository } from './modules/users' // ❌ No exportado

// ❌ MAL - Ruta directa que rompe encapsulación
import { UserFactory } from './modules/users/factories/user.factory' // ❌ Evitar
```

---

## 🚦 Checklist al crear un nuevo módulo

Al crear un módulo nuevo, verificar:

- [ ] ✅ `index.ts` raíz exporta SOLO API pública (Module, Entity, DTOs, Service, Exceptions)
- [ ] ✅ Carpetas internas tienen `index.ts` con `export *`
- [ ] ✅ Factories, Repositories, Validators tienen `index.ts` con comentario "NO exponer en raíz"
- [ ] ❌ Controllers NO se exportan en raíz (NestJS los maneja)
- [ ] ❌ Symbol tokens NO se exportan en raíz
- [ ] ✅ Documentación clara en cada `index.ts` sobre qué se exporta y por qué

---

## 💡 Beneficios de seguir esta guía

1. **Encapsulación**: Implementación privada protegida
2. **Imports limpios**: `from './modules/users'` en lugar de rutas largas
3. **Refactoring seguro**: Cambias implementación sin romper otros módulos
4. **Claridad**: Sabes qué es público y qué es privado
5. **Testeo fácil**: Mockeas solo la API pública
6. **Arquitectura limpia**: Separación clara de responsabilidades

---

## 🎓 Pregunta Común: ¿Por qué NO exponer Repository?

**Respuesta**: Los **Repositories son detalles de implementación**.

- Otros módulos NO deberían conocer CÓMO guardas datos
- Otros módulos usan el **Service** (que usa el Repository internamente)
- Si cambias de TypeORM a Prisma, solo cambias el Repository (otros módulos no se enteran)

```typescript
// ❌ MAL - Módulo externo usando Repository directamente
import { UsersRepository } from './modules/users'
export class AuthService {
  constructor(private usersRepo: UsersRepository) {} // ❌ Acoplamiento
}

// ✅ BIEN - Módulo externo usando Service
import { UsersService } from './modules/users'
export class AuthService {
  constructor(private usersService: UsersService) {} // ✅ Desacoplado
}
```

---

## 📝 Resumen Rápido

```typescript
// ✅ EXPONER en index.ts raíz
export * from './users.module'        // Module
export * from './entities/user.entity' // Entity
export * from './dtos'                // DTOs
export * from './services/users.service' // Service
export * from './exceptions'          // Exceptions

// ❌ NO EXPONER en index.ts raíz
// Repository, Factory, Validator, Controller, Symbol tokens
```

---

**Última actualización**: Enero 2026
**Mantenedor**: @limberg
