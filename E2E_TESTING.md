# E2E Testing Guide - Organizations & Users

## ✅ Tests Creados

Se han creado tests E2E completos usando **Supertest** para probar los controllers:

- ✅ `test/organizations.e2e-spec.ts` - 15 tests para Organizations Controller
- ✅ `test/jest-e2e.json` - Configuración de Jest para E2E

## 📦 Tests Incluidos

### Organizations Controller (15 tests)

**POST /organizations (6 tests):**
- ✅ Create organization with valid data
- ✅ Normalize name and email with factory
- ✅ Return 400 when required fields missing
- ✅ Return 400 when email format invalid
- ✅ Return 409 when organization name already exists
- ✅ Return 409 when organization NIT already exists

**GET /organizations (3 tests):**
- ✅ Return paginated organizations
- ✅ Return all organizations when all=true
- ✅ Filter organizations by search query

**GET /organizations/:id (2 tests):**
- ✅ Return organization by id
- ✅ Return 404 when organization not found

**PATCH /organizations/:id (2 tests):**
- ✅ Update organization successfully
- ✅ Return 404 when updating nonexistent organization

**DELETE /organizations/:id (2 tests):**
- ✅ Soft delete organization when no active users
- ✅ Return 404 when deleting nonexistent organization

## 🚀 Cómo Ejecutar los Tests E2E

### Prerequisitos

1. **Base de datos PostgreSQL corriendo**
   ```bash
   # Opción 1: Docker (recomendado para tests)
   docker run --name test-postgres \
     -e POSTGRES_PASSWORD=testpass \
     -e POSTGRES_USER=testuser \
     -e POSTGRES_DB=testdb \
     -p 5433:5432 \
     -d postgres:16

   # Opción 2: PostgreSQL local
   # Asegúrate de tener PostgreSQL corriendo en tu máquina
   ```

2. **Variables de entorno para tests**

   Crea un archivo `.env.test` en la raíz:
   ```bash
   # .env.test
   NODE_ENV=test
   PORT=3002

   # Database Test (puerto diferente para no afectar la DB de desarrollo)
   DATABASE_URL=postgresql://testuser:testpass@localhost:5433/testdb

   # O usa variables separadas
   DATABASE_HOST=localhost
   DATABASE_PORT=5433
   DATABASE_USER=testuser
   DATABASE_PASSWORD=testpass
   DATABASE_NAME=testdb
   ```

3. **Configurar NestJS para usar .env.test**

   El módulo ya está configurado para cargar `.env.test` cuando `NODE_ENV=test`.

### Ejecutar Tests

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar con más tiempo (si los tests tardan)
npx jest --config test/jest-e2e.json --testTimeout=30000

# Ejecutar un test específico
npx jest --config test/jest-e2e.json --testNamePattern="should create"

# Ejecutar con coverage
npx jest --config test/jest-e2e.json --coverage

# Ver logs detallados
npx jest --config test/jest-e2e.json --verbose
```

### Alternativa: Script npm

Agrega esto a `package.json` si aún no existe:

```json
{
  "scripts": {
    "test:e2e": "NODE_ENV=test jest --config test/jest-e2e.json --runInBand --detectOpenHandles",
    "test:e2e:watch": "NODE_ENV=test jest --config test/jest-e2e.json --watch",
    "test:e2e:cov": "NODE_ENV=test jest --config test/jest-e2e.json --coverage"
  }
}
```

## 🏗️ Estructura de Tests E2E

```typescript
describe('OrganizationsController (E2E)', () => {
  let app: INestApplication
  let dataSource: DataSource
  const createdIds: string[] = []

  beforeAll(async () => {
    // 1. Crear módulo de testing con AppModule completo
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    // 2. Inicializar app con ValidationPipe (igual que producción)
    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }))
    await app.init()

    // 3. Get DataSource para cleanup
    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    // Cleanup: Eliminar datos de prueba
    if (createdIds.length > 0) {
      await dataSource.query(
        `DELETE FROM organizations WHERE id = ANY($1)`,
        [createdIds]
      )
    }
    await app.close()
  })

  it('should create organization', async () => {
    const response = await request(app.getHttpServer())
      .post('/organizations')
      .send(createDto)
      .expect(201)

    createdIds.push(response.body.id) // Para cleanup
  })
})
```

## 🎯 Ventajas de Tests E2E vs Unit Tests para Controllers

### ❌ Unit Tests de Controllers (NO recomendado)

```typescript
// ❌ Unit test solo verifica que el controller llama al service
it('should call service.create', async () => {
  mockService.create.mockResolvedValue(org)
  await controller.create(dto)
  expect(mockService.create).toHaveBeenCalled()
})
// Poco útil: solo pruebas que el controller llama al service, nada más
```

### ✅ E2E Tests (Recomendado)

```typescript
// ✅ E2E test prueba FLUJO COMPLETO
it('should create organization', async () => {
  const response = await request(app.getHttpServer())
    .post('/organizations')
    .send(dto)
    .expect(201)

  expect(response.body).toMatchObject({
    id: expect.any(String),
    name: 'Test Org'
  })
})
```

**Qué prueba:**
- ✅ HTTP request completo (POST /organizations)
- ✅ Validación de DTOs con class-validator
- ✅ Guards de autenticación (si los hay)
- ✅ Pipes de transformación
- ✅ Controller → Service → Repository → DB (flujo completo)
- ✅ Exception filters
- ✅ Interceptors
- ✅ Respuestas HTTP reales

## 📝 Best Practices para E2E Tests

### 1. Usa una DB de Test Separada

```bash
# ❌ NO usar la misma DB que desarrollo
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# ✅ Usar DB de test separada (diferente puerto/nombre)
DATABASE_URL=postgresql://testuser:testpass@localhost:5433/myapp_test
```

### 2. Cleanup After Each Test

```typescript
afterAll(async () => {
  // Eliminar datos creados durante los tests
  if (createdIds.length > 0) {
    await dataSource.query(
      `DELETE FROM organizations WHERE id = ANY($1)`,
      [createdIds]
    )
  }
  await app.close()
})
```

### 3. Tests Independientes

Cada test debe ser independiente y no depender del orden de ejecución:

```typescript
// ✅ BIEN: Cada test crea sus propios datos
beforeAll(async () => {
  const response = await request(app.getHttpServer())
    .post('/organizations')
    .send(createDto)
  testOrgId = response.body.id
})

// ❌ MAL: Test depende de otro test
it('should update org created in previous test', async () => {
  // NO: depende de testOrgId de otro describe
})
```

### 4. Timeouts Apropiados

```typescript
// Aumentar timeout para tests E2E (conexión DB puede tardar)
describe('OrganizationsController (E2E)', () => {
  jest.setTimeout(30000) // 30 segundos

  // O por test individual
  it('should create', async () => {
    // ...
  }, 10000) // 10 segundos para este test
})
```

## 🔧 Troubleshooting

### Error: "Unable to connect to the database"

**Causa:** PostgreSQL no está corriendo o las credenciales son incorrectas.

**Solución:**
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# O revisar proceso local
ps aux | grep postgres

# Verificar variables de entorno
cat .env.test

# Probar conexión manualmente
psql -h localhost -p 5433 -U testuser -d testdb
```

### Error: "Timeout exceeded"

**Causa:** El módulo de NestJS tarda mucho en inicializar.

**Solución:**
```typescript
beforeAll(async () => {
  // ...
}, 30000) // Aumentar timeout del beforeAll
```

O en jest-e2e.json:
```json
{
  "testTimeout": 30000
}
```

### Error: "Jest did not exit"

**Causa:** Conexiones abiertas (DB, sockets, etc.) no se cerraron.

**Solución:**
```typescript
afterAll(async () => {
  await dataSource.destroy() // Cerrar conexión DB
  await app.close()          // Cerrar app NestJS
})
```

## 📊 Cobertura Actual de Tests

| Módulo | Unit Tests | E2E Tests | Total |
|--------|-----------|-----------|-------|
| **Organizations** | 20 tests (service) | 15 tests (controller) | **35 tests** |
| **Users** | 26 tests (service) + 17 (validator) | 0 tests (pendiente) | **43 tests** |
| **@core** | 122 tests | - | **122 tests** |
| **TOTAL** | **185 tests** | **15 tests** | **200 tests** |

## 🎯 Próximos Pasos

1. **Ejecutar tests E2E** (requiere DB corriendo)
2. **Crear users.e2e-spec.ts** (similar a organizations)
3. **Agregar tests de autenticación** (guards, JWT, etc.)
4. **CI/CD**: Configurar GitHub Actions para ejecutar E2E con PostgreSQL en Docker

## 📚 Referencias

- [NestJS E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Jest Configuration](https://jestjs.io/docs/configuration)
