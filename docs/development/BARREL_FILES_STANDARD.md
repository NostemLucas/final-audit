# Estándar de Barrel Files

Este documento define el patrón estandarizado de barrel files (`index.ts`) en el proyecto.

## ✅ Regla General

**Para evitar dependencias circulares:**
- **@core modules**: Usar barrel files libremente (son unidireccionales)
- **modules/ entre sí**: Usar imports directos para entidades y repository implementations

---

## 📁 Estructura de un Módulo

```
src/modules/users/
├── index.ts                      ← Barrel principal del módulo
├── users.module.ts               ← Módulo NestJS
├── controllers/
├── services/
├── use-cases/
├── entities/
│   └── user.entity.ts            ← ❌ NO exportar en barrel (import directo)
├── dtos/
│   ├── index.ts                  ← ✅ Barrel interno OK
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── exceptions/
│   ├── index.ts                  ← ✅ Barrel interno OK
│   ├── user-not-found.exception.ts
│   └── ...
├── repositories/
│   ├── index.ts                  ← ⚠️ Solo interface + token
│   ├── users.repository.ts       ← ❌ NO exportar (privada)
│   └── users-repository.interface.ts
├── validators/
├── factories/
└── ...
```

---

## 📝 Patrón por Tipo de Archivo

### 1. **Barrel Principal del Módulo** (`modules/users/index.ts`)

**Exportar:**
- ✅ Module (para AppModule)
- ✅ Service (si se usa en otros módulos)
- ✅ Exceptions (para manejo de errores)
- ✅ Repository Token + Interface (para DI)

**NO exportar:**
- ❌ Entity (usar import directo)
- ❌ DTOs (privados del módulo)
- ❌ Repository Implementation
- ❌ Validators, Factories, Use Cases

```typescript
// ✅ modules/users/index.ts
export * from './users.module'
export * from './services/users.service'
export * from './exceptions'
export { USERS_REPOSITORY } from './repositories'
export type { IUsersRepository } from './repositories'

// ❌ NO exportar:
// - Entity: import { UserEntity } from '../users/entities/user.entity'
```

### 2. **Barrel de Repositories** (`modules/users/repositories/index.ts`)

**Exportar:**
- ✅ Interface
- ✅ Token
- ✅ Types auxiliares (como Filters)

**NO exportar:**
- ❌ Implementation class

```typescript
// ✅ repositories/index.ts
export * from './users-repository.interface'
export const USERS_REPOSITORY = Symbol('IUsersRepository')

// ❌ NO exportar la implementación
```

### 3. **Barrel de Exceptions** (`modules/users/exceptions/index.ts`)

```typescript
// ✅ exceptions/index.ts - Exportar todo
export * from './user-not-found.exception'
export * from './email-already-exists.exception'
// ...
```

### 4. **Barrel de DTOs** (`modules/users/dtos/index.ts`)

```typescript
// ✅ dtos/index.ts - Exportar todo (solo se usan internamente)
export * from './create-user.dto'
export * from './update-user.dto'
// ...
```

### 5. **NO crear barrels para:**

- ❌ `entities/` (import directo para evitar circular deps)
- ❌ `use-cases/` (privados, llamados desde service)
- ❌ `validators/` (privados del módulo)
- ❌ `factories/` (privados del módulo)

---

## 🔄 Cómo Importar

### Desde **@core** (siempre seguro)

```typescript
// ✅ Usar barrel files
import { Transactional } from '@core/database'
import { ActivityService } from '@core/activities'
import { BaseEntity } from '@core/entities'
```

### Desde **otro módulo**

#### Entidades (relaciones TypeORM)
```typescript
// ✅ Import directo (evita circular dependency)
import { UserEntity } from '../../users/entities/user.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'

// ❌ NO usar barrel
import { UserEntity } from '../../users' // ← CIRCULAR DEPENDENCY
```

#### Repository Token/Interface
```typescript
// ✅ Usar barrel (solo exporta interface + token)
import { USERS_REPOSITORY, IUsersRepository } from '../../users/repositories'

// ❌ NO importar implementation
import { UsersRepository } from '../../users/repositories/users.repository' // ← MAL
```

#### Exceptions
```typescript
// ✅ Usar barrel
import { UserNotFoundException } from '../../users/exceptions'
// O desde el barrel principal
import { UserNotFoundException } from '../../users'
```

### Dentro del **mismo módulo**

```typescript
// ✅ Usar barrels libremente
import { CreateUserDto, UpdateUserDto } from '../../dtos'
import { UserNotFoundException } from '../../exceptions'
import { USERS_REPOSITORY } from '../../repositories'
```

---

## 📋 Checklist para Nuevos Módulos

Al crear un nuevo módulo, seguir este checklist:

### 1. Barrel Principal (`index.ts`)
- [ ] Exporta Module
- [ ] Exporta Service (si se usa externamente)
- [ ] Exporta Exceptions
- [ ] Exporta Repository Token + Interface
- [ ] **NO** exporta Entity
- [ ] **NO** exporta DTOs
- [ ] **NO** exporta Implementations

### 2. Barrel de Repositories (`repositories/index.ts`)
- [ ] Exporta Interface
- [ ] Exporta Token
- [ ] **NO** exporta Implementation class

### 3. Barrel de DTOs (`dtos/index.ts`)
- [ ] Exporta todos los DTOs

### 4. Barrel de Exceptions (`exceptions/index.ts`)
- [ ] Exporta todas las excepciones

### 5. Module File (`.module.ts`)
- [ ] Importa Repository Implementation **directamente** (no desde barrel)
- [ ] Importa Token desde barrel
- [ ] Exporta Service
- [ ] Exporta Repository Token (si otros módulos lo necesitan)

---

## ❌ Errores Comunes

### Error 1: Circular Dependency en Entidades

```typescript
// ❌ MAL - Causa circular dependency
import { OrganizationEntity } from '../../organizations'

// ✅ BIEN - Import directo
import { OrganizationEntity } from '../../organizations/entities/organization.entity'
```

### Error 2: Exportar Implementation en Barrel

```typescript
// ❌ MAL - repositories/index.ts
export * from './users.repository' // ← NO exportar

// ✅ BIEN
export * from './users-repository.interface'
export const USERS_REPOSITORY = Symbol('IUsersRepository')
```

### Error 3: Importar Implementation desde otro módulo

```typescript
// ❌ MAL - Otro módulo no debe importar la implementación
import { UsersRepository } from '../../users/repositories/users.repository'

// ✅ BIEN - Solo usa interface + token
import { USERS_REPOSITORY, IUsersRepository } from '../../users'
```

---

## 🎯 Resumen Visual

```
@core/                        ← ✅ Barrel files siempre seguros
  └── activities/
      └── index.ts           → export * from './services/activity.service'

modules/
  ├── users/
  │   ├── index.ts           → export Service, Exceptions, Token, Interface
  │   │                        ❌ NO exportar Entity
  │   ├── entities/
  │   │   └── user.entity.ts  ← Import directo: '../users/entities/user.entity'
  │   ├── repositories/
  │   │   └── index.ts       → export Interface + Token (NO Implementation)
  │   ├── dtos/
  │   │   └── index.ts       → export * (interno)
  │   └── exceptions/
  │       └── index.ts       → export * (público)
  │
  └── organizations/
      └── [misma estructura]
```

---

## 🔍 Verificar Circular Dependencies

```bash
# Build debe pasar sin errores de circular dependency
npm run build

# Tests deben pasar
npm test
```

Si aparece el error:
```
A circular dependency has been detected inside @InjectRepository()
```

**Solución:** Cambiar imports de entidades desde barrels a imports directos.

---

## 📚 Referencias

- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)
- [TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)
