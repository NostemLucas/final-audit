# E2E Testing Guide

## Overview

Los tests E2E (End-to-End) prueban el flujo completo de la aplicación **SIN MOCKS**, usando infraestructura real:
- ✅ **PostgreSQL real** - Base de datos de prueba
- ✅ **Redis real** - Almacenamiento de tokens
- ✅ **JWT real** - Generación y validación de tokens
- ✅ **HTTP real** - Peticiones HTTP completas con supertest

## ¿Por qué sin mocks?

Los tests con mocks no revelan problemas de integración como:
- Tokens que no se validan correctamente contra Redis
- Problemas de TTL o expiración
- Race conditions en transacciones
- Errores de configuración de JWT
- Problemas de conexión entre servicios

## Setup

### 1. Base de datos de prueba (Recomendado)

Crea una base de datos separada para tests:

```bash
# Crear DB de prueba
createdb audit_core_test

# O usando Docker
docker exec -it postgres-container psql -U postgres -c "CREATE DATABASE audit_core_test;"
```

Actualiza `.env.test`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_test
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Redis

Asegúrate de que Redis esté corriendo:

```bash
# Con Docker
docker-compose up -d redis

# O verifica si está corriendo
redis-cli ping  # Debe responder: PONG
```

## Running Tests

### Ejecutar todos los tests E2E

```bash
npm run test:e2e
```

### Ejecutar test específico

```bash
# Solo auth tests
npm run test:e2e -- test/auth.e2e-spec.ts

# Solo organizations tests
npm run test:e2e -- test/organizations.e2e-spec.ts
```

### Ejecutar con watch mode

```bash
npm run test:e2e -- --watch
```

### Ejecutar con coverage

```bash
npm run test:e2e -- --coverage
```

### Ejecutar en verbose mode (ver logs)

```bash
npm run test:e2e -- --verbose
```

## Test Structure

### Auth E2E Tests (`test/auth.e2e-spec.ts`)

Prueba el módulo de autenticación completo:

#### ✅ Login Flow
- Login con credenciales válidas
- Login con credenciales inválidas
- Validación de DTOs
- Generación de JWT y almacenamiento en Redis

#### ✅ Refresh Token Flow
- Refresh de access token
- Validación de refresh token
- Revocación de tokens
- Tokens expirados

#### ✅ Logout Flow
- Logout exitoso
- Revocación de tokens en Redis
- Intentos de uso de tokens revocados

#### ✅ 2FA Flow (Preparado para implementación)
- Generación de códigos 2FA
- Validación de códigos (un solo uso)
- Almacenamiento híbrido (JWT + Redis)

#### ✅ Reset Password Flow (Preparado para implementación)
- Solicitud de reset de contraseña
- Validación de tokens híbridos (JWT + Redis)
- Cambio de contraseña
- Revocación de tokens después del cambio

#### ✅ Security Tests
- Tokens malformados
- Tokens con firma inválida
- Validación de TTL en Redis

#### ✅ Performance Tests
- Múltiples logins concurrentes
- Stress test de Redis
- Validación de race conditions

### Organizations E2E Tests (`test/organizations.e2e-spec.ts`)

Prueba el módulo de organizaciones (ya existente).

## Best Practices

### ✅ DO's

1. **Usa base de datos de prueba separada**
   - Nunca uses la DB de desarrollo para tests
   - Los tests limpian datos automáticamente

2. **Limpia después de cada test**
   ```typescript
   afterAll(async () => {
     // Cleanup Redis
     await redis.flushdb()

     // Cleanup DB
     await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test%'])
   })
   ```

3. **Usa datos únicos para cada test**
   ```typescript
   const testEmail = `test-${Date.now()}@example.com`
   ```

4. **Verifica el estado de la infraestructura**
   ```typescript
   beforeAll(async () => {
     // Verify Redis is running
     await redis.ping()

     // Verify DB is accessible
     await dataSource.query('SELECT 1')
   })
   ```

5. **Prueba flujos completos, no funciones aisladas**
   ```typescript
   it('should complete full login flow', async () => {
     // 1. Login
     const loginRes = await request(app).post('/auth/login')...

     // 2. Use access token
     const profileRes = await request(app)
       .get('/users/me')
       .set('Authorization', `Bearer ${loginRes.body.accessToken}`)

     // 3. Refresh token
     const refreshRes = await request(app).post('/auth/refresh')...

     // 4. Logout
     await request(app).post('/auth/logout')...
   })
   ```

### ❌ DON'Ts

1. **NO uses mocks en tests E2E**
   - Eso derrota el propósito de los tests de integración

2. **NO hagas tests que dependan del orden**
   - Cada test debe ser independiente

3. **NO dejes datos huérfanos en la DB**
   - Siempre limpia en `afterAll` o `afterEach`

4. **NO uses timeouts arbitrarios**
   ```typescript
   // ❌ BAD
   await new Promise(resolve => setTimeout(resolve, 1000))

   // ✅ GOOD
   await waitForCondition(() => redis.exists(key))
   ```

## Debugging Tests

### Ver logs de Redis

```bash
# En otra terminal
redis-cli MONITOR
```

### Ver queries de PostgreSQL

Configura `LOG_LEVEL=debug` en `.env.test` para ver todas las queries.

### Debug con VSCode

`.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest E2E",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--config",
    "test/jest-e2e.json",
    "--runInBand",
    "--no-cache"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### Error: "Redis connection refused"

```bash
# Verifica que Redis está corriendo
redis-cli ping

# Inicia Redis si es necesario
docker-compose up -d redis
```

### Error: "Database does not exist"

```bash
# Crea la base de datos de prueba
createdb audit_core_test
```

### Tests muy lentos

```bash
# Ejecuta solo un test específico
npm run test:e2e -- test/auth.e2e-spec.ts -t "should login successfully"
```

### Error: "Port already in use"

```bash
# Cambia el puerto en los tests o mata el proceso
lsof -ti:3000 | xargs kill -9
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: audit_core_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/audit_core_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
```

## Next Steps

1. **Implementar endpoints faltantes**:
   - POST /auth/2fa/send
   - POST /auth/2fa/verify
   - POST /auth/forgot-password
   - POST /auth/reset-password

2. **Agregar más tests E2E**:
   - Templates module
   - Standards module
   - Evaluations module

3. **Performance testing**:
   - Load testing con k6 o artillery
   - Stress testing de endpoints críticos

4. **Security testing**:
   - OWASP Top 10 vulnerabilities
   - SQL injection attempts
   - XSS attempts
