# 📚 Organización de Tests - Guía Completa

Estructura clara y escalable para diferentes tipos de tests.

## 🎯 Tipos de Tests

### 1. Tests Unitarios
**Objetivo:** Probar lógica pura sin dependencias externas
**Qué:** Factories, Validators, Utils
**Cómo:** Sin mocks o mocks mínimos

### 2. Tests de Integración
**Objetivo:** Probar Services con lógica real
**Qué:** Services con Fake Repository
**Cómo:** Fake repo + Validator/Factory reales

### 3. Tests E2E (End to End)
**Objetivo:** Probar flujos completos desde HTTP hasta DB
**Qué:** Controladores + Services + DB real
**Cómo:** DB real (PostgreSQL en Docker)

---

## 📁 Estructura de Carpetas Recomendada

```
src/modules/users/
├── entities/
│   └── user.entity.ts
├── dtos/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── repositories/
│   ├── users.repository.ts
│   └── users-repository.interface.ts
├── validators/
│   ├── user.validator.ts
│   └── user.validator.spec.ts           ← ✅ UNIT (junto al archivo)
├── factories/
│   ├── user.factory.ts
│   └── user.factory.spec.ts             ← ✅ UNIT (junto al archivo)
├── services/
│   ├── users.service.ts
│   └── users.service.spec.ts            ← ✅ INTEGRATION (junto al archivo)
├── controllers/
│   └── users.controller.ts
│
└── __tests__/                            ← ✅ CARPETA DE TESTS
    ├── fixtures/                         ← Datos de prueba reutilizables
    │   ├── user.fixtures.ts              → TEST_USERS, UserBuilder
    │   └── fake-users.repository.ts      → FakeUsersRepository
    │
    ├── unit/                             ← Tests unitarios adicionales (opcional)
    │   ├── user.validator.spec.ts        → Si quieres separar
    │   └── user.factory.spec.ts          → Si quieres separar
    │
    ├── integration/                      ← Tests de integración (opcional)
    │   └── users.service.spec.ts         → Si quieres separar
    │
    └── e2e/                              ← Tests E2E con DB real
        └── users.e2e-spec.ts             → Flujos completos con PostgreSQL
```

---

## 🎨 Convención de Nombres

### Para Tests

| Tipo | Nombre | Ubicación |
|------|--------|-----------|
| **Unit** | `*.spec.ts` | Junto al archivo fuente |
| **Integration** | `*.spec.ts` | Junto al archivo o en `__tests__/integration/` |
| **E2E** | `*.e2e-spec.ts` | En `__tests__/e2e/` |
| **Fixtures** | `*.fixtures.ts` | En `__tests__/fixtures/` |
| **Fake Repo** | `fake-*.repository.ts` | En `__tests__/fixtures/` |

### Ejemplos

```
✅ user.factory.spec.ts           (Unit - junto al factory)
✅ user.validator.spec.ts         (Unit - junto al validator)
✅ users.service.spec.ts          (Integration - junto al service)
✅ users.e2e-spec.ts              (E2E - en __tests__/e2e/)
✅ user.fixtures.ts               (Datos - en __tests__/fixtures/)
✅ fake-users.repository.ts       (Fake - en __tests__/fixtures/)
```

---

## 📋 Convención de Describe Blocks

### Tests Unitarios

```typescript
// user.factory.spec.ts
describe('UserFactory', () => {
  describe('createFromDto', () => {
    it('should create user with hashed password', () => {})
    it('should normalize email to lowercase', () => {})
  })

  describe('updateFromDto', () => {
    it('should update only provided fields', () => {})
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {})
  })
})
```

### Tests de Integración

```typescript
// users.service.spec.ts
describe('UsersService (Integration)', () => {
  describe('create', () => {
    it('should create user with real validation', () => {})
    it('should throw when email exists', () => {})
  })

  describe('update', () => {
    it('should update user with real validation', () => {})
  })

  // ... más métodos
})
```

### Tests E2E

```typescript
// users.e2e-spec.ts
describe('Users (E2E)', () => {
  describe('POST /users', () => {
    it('should create user', () => {})
    it('should return 409 when email exists', () => {})
  })

  describe('GET /users/:id', () => {
    it('should return user', () => {})
    it('should return 404 when not found', () => {})
  })
})
```

---

## 🏗️ Estructura por Módulo

### Opción A: Tests junto al código (Recomendado para proyectos pequeños/medianos)

```
src/modules/users/
├── factories/
│   ├── user.factory.ts
│   └── user.factory.spec.ts              ✅ Unit test aquí
├── validators/
│   ├── user.validator.ts
│   └── user.validator.spec.ts            ✅ Unit test aquí
├── services/
│   ├── users.service.ts
│   └── users.service.spec.ts             ✅ Integration test aquí
└── __tests__/
    ├── fixtures/
    │   ├── user.fixtures.ts
    │   └── fake-users.repository.ts
    └── e2e/
        └── users.e2e-spec.ts             ✅ E2E test aquí
```

**Ventajas:**
- ✅ Fácil encontrar tests relacionados al código
- ✅ Menos navegación entre carpetas
- ✅ Convención de NestJS

### Opción B: Tests separados (Para proyectos grandes)

```
src/modules/users/
├── factories/
│   └── user.factory.ts
├── validators/
│   └── user.validator.ts
├── services/
│   └── users.service.ts
└── __tests__/
    ├── fixtures/
    │   ├── user.fixtures.ts
    │   └── fake-users.repository.ts
    ├── unit/
    │   ├── user.factory.spec.ts
    │   └── user.validator.spec.ts
    ├── integration/
    │   └── users.service.spec.ts
    └── e2e/
        └── users.e2e-spec.ts
```

**Ventajas:**
- ✅ Separación clara de tipos de tests
- ✅ Fácil ejecutar solo un tipo de test
- ✅ Mejor para equipos grandes

---

## 🎯 Comando de Jest por Tipo

### Ejecutar por patrón

```bash
# Solo tests unitarios (*.spec.ts, no e2e)
npm test -- --testPathIgnorePatterns=e2e

# Solo tests de integración
npm test -- --testMatch="**/*.service.spec.ts"

# Solo tests E2E
npm test -- --testMatch="**/*.e2e-spec.ts"

# Por módulo
npm test -- users
npm test -- organizations

# Por archivo específico
npm test -- user.factory.spec.ts
```

### package.json scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=e2e",
    "test:integration": "jest --testMatch='**/*.service.spec.ts'",
    "test:e2e": "jest --testMatch='**/*.e2e-spec.ts' --runInBand",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
```

---

## 📦 Fixtures Organizados

### user.fixtures.ts

```typescript
/**
 * ✅ BUENA PRÁCTICA: Organizar fixtures por categoría
 */

// 1. Datos predefinidos básicos
export const TEST_USERS = {
  ADMIN: { id: 'admin', email: 'admin@test.com', roles: [Role.ADMIN] },
  AUDITOR: { id: 'auditor', email: 'auditor@test.com', roles: [Role.AUDITOR] },
  USER: { id: 'user', email: 'user@test.com', roles: [Role.USUARIO] },
}

// 2. Datos para casos edge
export const EDGE_CASE_USERS = {
  INACTIVE: { ...baseUser, status: UserStatus.INACTIVE },
  NO_ORGANIZATION: { ...baseUser, organizationId: null },
  MULTIPLE_ROLES: { ...baseUser, roles: [Role.ADMIN, Role.AUDITOR] },
}

// 3. Builder para variaciones
export class UserBuilder {
  // ...
}

// 4. Helpers rápidos
export const createTestUser = (overrides?) => ({ ... })
export const createMultipleUsers = (count: number) => ([...])
```

---

## 🧪 Ejemplo: Test E2E con PostgreSQL Real

### Setup con TestContainers (PostgreSQL real en Docker)

```typescript
// users.e2e-spec.ts
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as request from 'supertest'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

describe('Users (E2E with Real PostgreSQL)', () => {
  let app: INestApplication
  let postgresContainer: StartedTestContainer

  beforeAll(async () => {
    // ✅ Iniciar PostgreSQL en Docker
    postgresContainer = await new GenericContainer('postgres:15')
      .withEnvironment({ POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .start()

    const host = postgresContainer.getHost()
    const port = postgresContainer.getMappedPort(5432)

    // ✅ Crear app con DB real
    const moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username: 'postgres',
          password: 'test',
          database: 'postgres',
          entities: [UserEntity],
          synchronize: true, // Solo para tests
        }),
        UsersModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await postgresContainer.stop()
  })

  it('POST /users - should create user in real database', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        names: 'Test',
        email: 'test@test.com',
        password: 'Pass123!',
        // ...
      })
      .expect(201)

    expect(response.body.id).toBeDefined()
    expect(response.body.email).toBe('test@test.com')
  })

  it('POST /users - should enforce UNIQUE constraint on email', async () => {
    // Crear primer usuario
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'duplicate@test.com', ... })
      .expect(201)

    // Intentar duplicar
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'duplicate@test.com', ... })
      .expect(409) // Conflict
  })
})
```

---

## 📊 Distribución Recomendada de Tests

```
Pirámide de Testing:
         /\
        /E2\      ← 10% (Pocos, lentos, completos)
       /____\       - Con PostgreSQL real
      /      \      - Flujos críticos de negocio
     / Integ \   ← 30% (Moderados, rápidos)
    /__________\    - Fake Repository
   /            \   - Validator + Factory reales
  /   Unitarios  \ ← 60% (Muchos, instantáneos)
 /________________\  - Sin mocks
                     - Lógica pura
```

### Ejemplo práctico:

```
Users Module (Total: 50 tests)
├── Unit Tests (30)
│   ├── user.factory.spec.ts (15 tests)
│   └── user.validator.spec.ts (15 tests)
├── Integration Tests (15)
│   └── users.service.spec.ts (15 tests con Fake Repo)
└── E2E Tests (5)
    └── users.e2e-spec.ts (5 tests con PostgreSQL real)
```

---

## 🎯 Plan de Migración

### Paso 1: Reorganizar fixtures

```bash
# Mover fixtures a carpeta dedicada
mkdir -p src/modules/users/__tests__/fixtures
mv src/modules/users/__tests__/user.fixtures.ts src/modules/users/__tests__/fixtures/
mv src/modules/users/__tests__/fake-users.repository.ts src/modules/users/__tests__/fixtures/
```

### Paso 2: Renombrar tests

```bash
# Renombrar tests de integración (si están separados)
mv src/modules/users/services/users.service.fake-repo.spec.ts \
   src/modules/users/__tests__/integration/users.service.spec.ts
```

### Paso 3: Crear E2E

```bash
# Crear carpeta E2E
mkdir -p src/modules/users/__tests__/e2e

# Crear test E2E
touch src/modules/users/__tests__/e2e/users.e2e-spec.ts
```

### Paso 4: Actualizar package.json

```json
{
  "scripts": {
    "test:unit": "jest --testPathIgnorePatterns=e2e --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e --runInBand",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

---

## ✅ Checklist de Organización

### Por cada módulo:

- [ ] Fixtures en `__tests__/fixtures/`
- [ ] Fake Repository en `__tests__/fixtures/`
- [ ] Tests unitarios junto al código o en `__tests__/unit/`
- [ ] Tests de integración junto al service o en `__tests__/integration/`
- [ ] Al menos 1 test E2E en `__tests__/e2e/`
- [ ] Scripts de npm para cada tipo de test

### Global:

- [ ] Documentación clara de estructura (este archivo)
- [ ] Convenciones de nombres consistentes
- [ ] Pirámide de testing balanceada (60% unit, 30% integration, 10% e2e)
- [ ] CI/CD configurado para correr todos los tests

---

## 💡 Tips Finales

### 1. Mantén fixtures DRY

```typescript
// ✅ BIEN: Fixtures reutilizables
export const TEST_USERS = {
  ADMIN: createBaseUser({ roles: [Role.ADMIN] }),
  USER: createBaseUser({ roles: [Role.USUARIO] }),
}

// ❌ MAL: Duplicar datos
const admin = { id: '1', name: 'Admin', ... }
const user = { id: '2', name: 'User', ... }
```

### 2. Un tipo de test por archivo

```typescript
// ✅ BIEN: Solo integration tests
describe('UsersService (Integration)', () => {
  // Solo tests de integración
})

// ❌ MAL: Mezclar tipos
describe('UsersService', () => {
  describe('Unit', () => {}) // ❌
  describe('Integration', () => {}) // ❌
})
```

### 3. Nombre descriptivo de describe

```typescript
// ✅ BIEN: Indica tipo de test
describe('UsersService (Integration)', () => {})
describe('Users (E2E)', () => {})

// ❌ MAL: No indica tipo
describe('UsersService', () => {})
```

---

## 📚 Resumen

**Estructura recomendada:**
```
__tests__/
├── fixtures/          ← Datos reutilizables
│   ├── *.fixtures.ts
│   └── fake-*.repository.ts
├── integration/       ← Tests con Fake Repo (opcional)
│   └── *.service.spec.ts
└── e2e/              ← Tests con DB real
    └── *.e2e-spec.ts
```

**Distribución:**
- 60% Unit (junto al código)
- 30% Integration (Fake Repository)
- 10% E2E (PostgreSQL real)

**Scripts npm:**
```bash
npm run test:unit          # Rápido, solo lógica
npm run test:integration   # Medio, con Fake Repo
npm run test:e2e          # Lento, DB real
```

¡Listo para escalar! 🚀
