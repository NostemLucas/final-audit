# 🔍 Mejora Propuesta: Testing de Repositorios

## 🚨 Problema Identificado

Actualmente tienes una **brecha en los tests**:

### ✅ Lo Que SÍ Está Probado
```
src/modules/organizations/
├── factories/
│   └── organization.factory.spec.ts     ✅ UNIT - Probado (17 tests)
├── validators/
│   └── organization.validator.spec.ts   ✅ UNIT - Probado (con fake repo)
└── services/
    └── organizations.service.spec.ts    ✅ INTEGRATION - Probado (con fake repo)
```

### ❌ Lo Que NO Está Probado
```
src/modules/organizations/
└── repositories/
    └── organization.repository.ts       ❌ SIN TESTS
        ├── findByNit()                  ❌ Sin probar
        ├── findByName()                 ❌ Sin probar
        ├── findAllActive()              ❌ Sin probar
        ├── findActiveById()             ❌ Sin probar
        ├── findActiveByNit()            ❌ Sin probar
        ├── countActiveUsers()           ❌ Sin probar (QueryBuilder!)
        └── hardDelete()                 ❌ Sin probar
```

## 🤔 ¿Por Qué Es Problema?

### 1. Repositorios Tienen Lógica NO Trivial

```typescript
// ❌ Este método usa QueryBuilder - NUNCA se prueba
async countActiveUsers(organizationId: string): Promise<number> {
  return await this.getRepo()
    .createQueryBuilder('org')
    .leftJoin('org.users', 'user')
    .where('org.id = :id', { id: organizationId })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .getCount()
}
```

**Si este query tiene un bug, NO lo detectarás hasta producción.**

### 2. Fake Repository NO Es Real

```typescript
// FakeOrganizationsRepository
async countActiveUsers(organizationId: string): Promise<number> {
  const org = this.organizations.get(organizationId)
  if (!org) return 0

  // ❌ Esto simula el count, pero NO prueba el QueryBuilder real
  return (org as any)._activeUsersCount || 0
}
```

**El fake repo simula el comportamiento, pero NO usa TypeORM real.**

### 3. Queries SQL Pueden Fallar

- ❌ ¿El `leftJoin` está correcto?
- ❌ ¿Las relaciones están bien definidas?
- ❌ ¿Los índices están correctos?
- ❌ ¿Los nombres de columnas coinciden?

**Sin tests con DB real, no lo sabes.**

---

## ✅ Solución Propuesta: Pirámide de Testing Mejorada

```
           /\
          /E2\        ← 10% E2E (Flujos completos con DB real)
         /____\         - POST /users, GET /organizations
        /      \        - Prueba desde HTTP hasta DB
       / Serv  \      ← 20% Service Integration (Fake Repo)
      /__________\      - Validator + Factory reales
     /            \     - Fake Repository
    /   Repo      \   ← 30% Repository (DB In-Memory)
   /________________\    - OrganizationRepository con SQLite
  /                  \   - Prueba queries, joins, counts
 /    Unit           \ ← 40% Unit (Sin mocks)
/______________________\  - Factories, Validators
```

### Nueva Distribución

| Tipo | Qué Prueba | Cómo | % |
|------|-----------|------|---|
| **Unit** | Factories, Validators | Sin mocks | 40% |
| **Repository** | Métodos de repo | DB in-memory (SQLite) | 30% |
| **Service Integration** | Services | Fake Repository | 20% |
| **E2E** | Flujos completos | DB real (PostgreSQL) | 10% |

---

## 🎯 Implementación por Capas

### Capa 1️⃣: Unit Tests (Ya lo tienes ✅)

**Qué:** Factories, Validators
**Cómo:** Sin mocks o fake mínimo
**Ejemplo:**
```typescript
// organization.factory.spec.ts
it('should normalize NIT', () => {
  const result = factory.createFromDto({ nit: '123-456 789' })
  expect(result.nit).toBe('123-456789')  // ✅ Sin DB
})
```

### Capa 2️⃣: Repository Tests (NUEVO - Falta ❌)

**Qué:** Repositorios con métodos específicos
**Cómo:** DB in-memory (SQLite o PostgreSQL en Docker)
**Por qué:** Probar queries SQL reales, joins, counts

**Ejemplo:**
```typescript
// organization.repository.spec.ts
describe('OrganizationRepository (with In-Memory DB)', () => {
  let repository: OrganizationRepository
  let dataSource: DataSource

  beforeAll(async () => {
    // ✅ Crear DB SQLite en memoria
    dataSource = await createTestDataSource([OrganizationEntity, UserEntity])
    repository = new OrganizationRepository(
      dataSource.getRepository(OrganizationEntity),
      clsService
    )
  })

  it('should find organization by NIT', async () => {
    // Arrange - Crear en DB real
    const org = await repository.save({
      name: 'Test Org',
      nit: '1234567890',
      // ...
    })

    // Act - Buscar con método real
    const found = await repository.findByNit('1234567890')

    // Assert - ✅ Probando query SQL real
    expect(found).toBeDefined()
    expect(found!.id).toBe(org.id)
  })

  it('should count active users with real QueryBuilder', async () => {
    // Arrange - Crear org + users en DB
    const org = await repository.save({ name: 'Org', nit: '111' })
    // Crear usuarios (usa UserRepository)
    await createUsers(org.id, 3, true)  // 3 activos
    await createUsers(org.id, 2, false) // 2 inactivos

    // Act - ✅ Ejecuta QueryBuilder REAL
    const count = await repository.countActiveUsers(org.id)

    // Assert - Verifica que join funciona
    expect(count).toBe(3)  // Solo activos
  })
})
```

### Capa 3️⃣: Service Integration (Ya lo tienes ✅)

**Qué:** Services con lógica de negocio
**Cómo:** Fake Repository + Validator/Factory reales
**Por qué:** Probar lógica sin complejidad de DB

```typescript
// organizations.service.spec.ts (ya existe)
it('should create with validation', async () => {
  fakeRepository.seed([TEST_ORG_1])
  const result = await service.create(dto)
  expect(result.id).toBeDefined()
})
```

**¿Por qué mantener fake repo aquí?**
- ✅ Los repositorios YA están probados en Capa 2
- ✅ Service solo prueba lógica de negocio
- ✅ Más rápido que con DB real

### Capa 4️⃣: E2E (Falta ❌)

**Qué:** Flujos completos desde HTTP
**Cómo:** DB PostgreSQL real (Docker)
**Por qué:** Probar integración completa

```typescript
// organizations.e2e-spec.ts (nuevo)
it('POST /organizations - should create in real DB', async () => {
  await request(app.getHttpServer())
    .post('/organizations')
    .send(createDto)
    .expect(201)

  // ✅ Verifica que quedó en DB real
  const org = await orgRepository.findByNit(createDto.nit)
  expect(org).toBeDefined()
})
```

---

## 📁 Estructura de Archivos Propuesta

```
src/modules/organizations/
├── factories/
│   ├── organization.factory.ts
│   └── organization.factory.spec.ts           ← ✅ Unit (ya existe)
│
├── validators/
│   ├── organization.validator.ts
│   └── organization.validator.spec.ts         ← ✅ Unit (ya existe)
│
├── repositories/
│   ├── organization.repository.ts
│   └── organization.repository.spec.ts        ← ⚠️  NUEVO (Repository con DB in-memory)
│
├── services/
│   ├── organizations.service.ts
│   └── organizations.service.spec.ts          ← ✅ Integration con fake repo (ya existe)
│
└── __tests__/
    ├── fixtures/
    │   ├── organization.fixtures.ts
    │   └── fake-organizations.repository.ts   ← ✅ Para tests de service
    │
    ├── helpers/
    │   └── test-database.helper.ts            ← ⚠️  NUEVO (Helper para crear DB in-memory)
    │
    └── e2e/
        └── organizations.e2e-spec.ts          ← ⚠️  NUEVO (E2E con PostgreSQL real)
```

---

## 🔧 Implementación Paso a Paso

### Paso 1: Crear Helper para DB In-Memory

```typescript
// src/@core/testing/test-database.helper.ts
import { DataSource } from 'typeorm'

export async function createInMemoryDataSource(
  entities: Function[]
): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities,
    synchronize: true,
    logging: false,
  })

  await dataSource.initialize()
  return dataSource
}

export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name)
    await repository.clear()
  }
}
```

### Paso 2: Crear Repository Test

```typescript
// organization.repository.spec.ts
import { DataSource } from 'typeorm'
import { createInMemoryDataSource, cleanDatabase } from '@core/testing'
import { OrganizationRepository } from './organization.repository'
import { OrganizationEntity } from '../entities/organization.entity'
import { UserEntity } from '../../users/entities/user.entity'
import { ClsService } from 'nestjs-cls'

describe('OrganizationRepository (with SQLite In-Memory)', () => {
  let repository: OrganizationRepository
  let dataSource: DataSource
  let clsService: ClsService

  beforeAll(async () => {
    // Crear DB en memoria
    dataSource = await createInMemoryDataSource([
      OrganizationEntity,
      UserEntity,
    ])

    // Mock CLS (no lo necesitamos para tests de repo)
    clsService = {
      get: jest.fn(),
    } as any

    repository = new OrganizationRepository(
      dataSource.getRepository(OrganizationEntity),
      clsService,
    )
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  afterEach(async () => {
    await cleanDatabase(dataSource)
  })

  describe('findByNit', () => {
    it('should find organization by NIT', async () => {
      // Arrange
      const org = await repository.save({
        name: 'Test Org',
        nit: '1234567890',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'test@test.com',
        isActive: true,
      })

      // Act
      const found = await repository.findByNit('1234567890')

      // Assert
      expect(found).toBeDefined()
      expect(found!.id).toBe(org.id)
      expect(found!.name).toBe('Test Org')
    })

    it('should return null when NIT not found', async () => {
      const found = await repository.findByNit('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('countActiveUsers', () => {
    it('should count only active users', async () => {
      // Arrange - Crear organización
      const org = await repository.save({
        name: 'Org',
        nit: '111',
        description: 'Test',
        address: 'Test',
        phone: '71234567',
        email: 'org@test.com',
        isActive: true,
      })

      // Crear usuarios (necesitas UserRepository)
      const userRepo = dataSource.getRepository(UserEntity)

      // 3 usuarios activos
      await userRepo.save({
        names: 'User 1',
        lastNames: 'Test',
        email: 'user1@test.com',
        username: 'user1',
        ci: '11111111',
        password: 'hash',
        organizationId: org.id,
        isActive: true,
        roles: [],
      })
      await userRepo.save({
        names: 'User 2',
        lastNames: 'Test',
        email: 'user2@test.com',
        username: 'user2',
        ci: '22222222',
        password: 'hash',
        organizationId: org.id,
        isActive: true,
        roles: [],
      })
      await userRepo.save({
        names: 'User 3',
        lastNames: 'Test',
        email: 'user3@test.com',
        username: 'user3',
        ci: '33333333',
        password: 'hash',
        organizationId: org.id,
        isActive: true,
        roles: [],
      })

      // 2 usuarios inactivos
      await userRepo.save({
        names: 'User 4',
        lastNames: 'Test',
        email: 'user4@test.com',
        username: 'user4',
        ci: '44444444',
        password: 'hash',
        organizationId: org.id,
        isActive: false,  // ❌ Inactivo
        roles: [],
      })
      await userRepo.save({
        names: 'User 5',
        lastNames: 'Test',
        email: 'user5@test.com',
        username: 'user5',
        ci: '55555555',
        password: 'hash',
        organizationId: org.id,
        isActive: false,  // ❌ Inactivo
        roles: [],
      })

      // Act - ✅ Ejecuta QueryBuilder REAL
      const count = await repository.countActiveUsers(org.id)

      // Assert
      expect(count).toBe(3)  // Solo los activos
    })
  })
})
```

### Paso 3: Actualizar npm scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=e2e-spec.ts --testPathIgnorePatterns=service.spec.ts --testPathIgnorePatterns=repository.spec.ts",
    "test:repository": "jest repository.spec.ts",
    "test:integration": "jest service.spec.ts",
    "test:e2e": "jest e2e-spec.ts --runInBand",
    "test:all": "npm run test:unit && npm run test:repository && npm run test:integration && npm run test:e2e"
  }
}
```

---

## 📊 Comparación: Antes vs Después

### ANTES (Situación Actual)

```
Tests:
├── Unit (factories, validators)     ✅ 80 tests
├── Integration (services fake repo) ✅ 32 tests
├── Repository                       ❌ 0 tests  ← PROBLEMA
└── E2E                              ❌ 0 tests

Total: 112 tests

Brecha: Repositorios SIN probar
```

### DESPUÉS (Propuesta)

```
Tests:
├── Unit (factories, validators)     ✅ 80 tests   (40%)
├── Repository (DB in-memory)        ✅ 50 tests   (30%)  ← NUEVO
├── Integration (services fake repo) ✅ 32 tests   (20%)
└── E2E (PostgreSQL real)            ✅ 15 tests   (10%)  ← NUEVO

Total: ~177 tests

Sin brechas: Todo probado ✅
```

---

## 🎯 Ventajas de Esta Estructura

### 1. ✅ Repositorios Probados con DB Real
```typescript
// ✅ Prueba que el QueryBuilder funciona
const count = await repository.countActiveUsers(org.id)
expect(count).toBe(3)
```

### 2. ✅ Services Mantienen Fake Repo (Rápidos)
```typescript
// ✅ Service solo prueba lógica, repo ya está probado
fakeRepository.seed([TEST_ORG])
const result = await service.create(dto)
```

### 3. ✅ E2E Prueba Flujo Completo
```typescript
// ✅ Desde HTTP hasta DB
await request(app).post('/organizations').send(dto).expect(201)
```

### 4. ✅ Separación Clara

| Capa | Qué Prueba | Velocidad | Cuándo Falla |
|------|-----------|-----------|--------------|
| Unit | Lógica pura | ⚡ Instantáneo | Bug en factory/validator |
| Repository | Queries SQL | 🚀 Rápido | Bug en query/join |
| Service | Lógica negocio | 🚀 Rápido | Bug en validación/flujo |
| E2E | Integración | 🐌 Lento | Bug de integración |

---

## 🚀 Próximos Pasos

### Prioridad 1: Repository Tests (Crítico)
1. Crear helper `test-database.helper.ts`
2. Crear `organization.repository.spec.ts`
3. Crear `users.repository.spec.ts`
4. Añadir script `npm run test:repository`

**Tiempo estimado:** 2-3 horas
**Tests a crear:** ~40-50

### Prioridad 2: E2E Tests (Importante)
1. Configurar TestContainers (PostgreSQL en Docker)
2. Crear `organizations.e2e-spec.ts`
3. Crear `users.e2e-spec.ts`
4. Probar flujos críticos

**Tiempo estimado:** 3-4 horas
**Tests a crear:** ~10-15

---

## 💡 Conclusión

**Problema actual:**
- ❌ Repositorios NO están probados
- ❌ Queries SQL pueden tener bugs
- ❌ No hay E2E tests

**Solución:**
- ✅ Repository tests con SQLite in-memory (probar queries)
- ✅ Service tests siguen con fake repo (probar lógica)
- ✅ E2E tests con PostgreSQL real (probar flujo completo)

**Beneficio:**
- ✅ Cubres TODAS las capas
- ✅ Sin duplicación (cada capa prueba una cosa)
- ✅ Tests rápidos (SQLite in-memory)
- ✅ Confianza total (queries probados)

---

¿Quieres que empiece creando los Repository tests con SQLite in-memory?
