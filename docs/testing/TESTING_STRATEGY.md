# Testing Strategy - Unit Tests vs Integration Tests

## TL;DR - La Respuesta

**Para tests de SERVICIOS, usa MOCKS de Jest, NO Fake Repositories.**

## El Problema que Tenías

### ❌ Fake Repository Approach (Over-engineering)

```typescript
// FakeOrganizationsRepository.ts - ~240 líneas
export class FakeOrganizationsRepository implements IOrganizationRepository {
  private organizations: Map<string, OrganizationEntity> = new Map()

  // Reimplementación completa del repositorio
  async save(data) { /* lógica completa */ }
  async findById(id) { /* lógica completa */ }
  async findByNit(nit) { /* búsqueda completa */ }
  // ... 15+ métodos más
}

// Test usando Fake Repository
it('should create organization', async () => {
  fakeRepository.seed([TEST_ORGANIZATIONS.ORG_1])

  const result = await service.create(dto)

  // ❌ Problema: Estás probando indirectamente el fake repo
  const saved = await fakeRepository.findById(result.id)
  expect(saved).toBeDefined()
})
```

**Problemas:**
1. **Duplicación masiva**: Reimplementas toda la lógica del repositorio (~240 líneas)
2. **Mantenimiento doble**: Si cambias el repo real, debes cambiar el fake
3. **Pruebas mezcladas**: Estás probando el fake repo + el servicio (no solo el servicio)
4. **Lento**: Ejecutas lógica real de búsqueda/guardado en memoria
5. **Confusión**: ¿Estás probando el servicio o el repositorio?

### ✅ Jest Mocks Approach (Correcto para Unit Tests)

```typescript
// Test usando Mocks de Jest
it('should create organization', async () => {
  // Arrange - Define SOLO el comportamiento que necesitas
  mockRepository.save.mockResolvedValue({ id: '1', ...dto })
  mockValidator.validateUniqueName.mockResolvedValue(undefined)

  // Act
  const result = await service.create(dto)

  // Assert - Verifica que el SERVICIO orquestó correctamente
  expect(mockFactory.createFromDto).toHaveBeenCalledWith(dto)
  expect(mockValidator.validateUniqueName).toHaveBeenCalled()
  expect(mockRepository.save).toHaveBeenCalled()
  expect(result.id).toBe('1')
})
```

**Ventajas:**
1. **Simple**: ~10 líneas de setup vs ~240 del fake
2. **Enfocado**: Pruebas SOLO la lógica del servicio
3. **Rápido**: No hay lógica real, solo mocks
4. **Claro**: Ves exactamente qué se llama y con qué parámetros
5. **Mantenible**: Cambias solo lo que necesitas para cada test

## Comparación Visual

| Aspecto | Fake Repository | Jest Mocks |
|---------|----------------|------------|
| **Setup Code** | ~240 líneas | ~10 líneas |
| **Mantenimiento** | Alto (duplicas repo) | Bajo (solo mocks) |
| **¿Qué pruebas?** | Repo + Servicio | Solo Servicio |
| **Velocidad** | Lento (lógica real) | Rápido (solo mocks) |
| **Claridad** | Baja (mezclado) | Alta (enfocado) |
| **Acoplamiento** | Alto | Bajo |

## Cuándo Usar Cada Uno

### Unit Tests (Servicios) → Jest Mocks ✅

**Objetivo**: Probar la **lógica de orquestación** del servicio

```typescript
// ✅ Usa Mocks para probar que el servicio:
// 1. Llama al factory para normalizar datos
// 2. Llama al validator para validar
// 3. Llama al repository para guardar
// 4. Maneja errores correctamente

it('should coordinate create operation', async () => {
  mockFactory.createFromDto.mockReturnValue(normalized)
  mockValidator.validateUniqueName.mockResolvedValue(undefined)
  mockRepository.save.mockResolvedValue(saved)

  await service.create(dto)

  expect(mockFactory.createFromDto).toHaveBeenCalledWith(dto)
  expect(mockValidator.validateUniqueName).toHaveBeenCalled()
  expect(mockRepository.save).toHaveBeenCalled()
})
```

### Integration Tests (Repositorios) → Fake o DB Real ✅

**Objetivo**: Probar que el **repositorio funciona correctamente con la DB**

```typescript
// ✅ Para repositorios, usa DB real o fake
// (Pero ya lo hiciste en base.repository.spec.ts)

it('should save and retrieve from database', async () => {
  const org = await repository.save(data)
  const found = await repository.findById(org.id)
  expect(found).toEqual(org)
})
```

### E2E Tests → DB Real ✅

**Objetivo**: Probar el **flujo completo** (Controller → Service → Repository → DB)

```typescript
// ✅ Para E2E, usa DB real (Docker)
it('should create organization via API', async () => {
  const response = await request(app)
    .post('/organizations')
    .send(dto)
    .expect(201)

  expect(response.body.id).toBeDefined()
})
```

## Regla Simple

```
┌─────────────────────────────────────────────────────┐
│  ¿Qué estoy probando?                               │
├─────────────────────────────────────────────────────┤
│  Servicio      → Mock con Jest                      │
│  Repositorio   → DB real o Fake (ya lo hiciste)     │
│  Controller    → Mock del servicio                  │
│  E2E           → DB real (Docker)                   │
└─────────────────────────────────────────────────────┘
```

## Plan de Refactorización

### Paso 1: Usar helpers de mocking

```bash
# Ya creado en @core/testing/mock-helpers.ts
```

```typescript
import { createRepositoryMock, createMock } from '@core/testing'

const mockRepo = createRepositoryMock<IOrganizationRepository>({
  findByNit: jest.fn(),
  findByName: jest.fn(),
})
```

### Paso 2: Refactorizar tests de servicios

**Archivos a modificar:**
- `src/modules/organizations/services/organizations.service.spec.ts`
- `src/modules/users/services/users.service.spec.ts`

**Cambios:**
1. Reemplazar `FakeOrganizationsRepository` con `jest.Mocked<IOrganizationRepository>`
2. Reemplazar `FakeUsersRepository` con `jest.Mocked<IUserRepository>`
3. Usar `mockRepository.method.mockResolvedValue(...)` en lugar de `fakeRepository.seed(...)`
4. Verificar llamadas con `expect(mockRepo.method).toHaveBeenCalledWith(...)`

### Paso 3: Eliminar archivos innecesarios

**Archivos a eliminar:**
- `src/modules/organizations/__tests__/fixtures/fake-organizations.repository.ts` (~240 líneas)
- `src/modules/users/__tests__/fixtures/fake-users.repository.ts` (~240 líneas)

**Archivos a MANTENER:**
- `organization.fixtures.ts` ✅ (datos de prueba útiles)
- `user.fixtures.ts` ✅ (datos de prueba útiles)

### Paso 4: Actualizar imports

```typescript
// Antes
import { FakeOrganizationsRepository } from '../__tests__/fixtures/fake-organizations.repository'

// Después
import { createRepositoryMock } from '@core/testing'
import type { IOrganizationRepository } from '../repositories'
```

## Ejemplo Completo Refactorizado

Ver archivo de ejemplo:
- `src/modules/organizations/services/organizations.service.REFACTORED.spec.ts`

Este archivo muestra el enfoque correcto usando mocks de Jest.

## Conclusión

**Tu intuición es 100% correcta:**

> "el faker está redescubriendo el repo... para el caso sería mejor ir directo y probar la lógica, pero en este caso es mejor mockear directo con jest... después de todo el repo no es la prueba sino el servicio"

**Exacto.** El Fake Repository era over-engineering. Para tests unitarios de servicios:
- Mock las dependencias con Jest
- Prueba solo la lógica de orquestación del servicio
- Mantén los fixtures para datos de prueba
- Deja los tests de integración para el repositorio (que ya hiciste en `base.repository.spec.ts`)

**Resultado:**
- ~480 líneas de código eliminadas (2 fake repos)
- Tests más rápidos
- Tests más claros
- Menos mantenimiento

## Referencias

- Ejemplo refactorizado: `organizations.service.REFACTORED.spec.ts`
- Mock helpers: `@core/testing/mock-helpers.ts`
- Testing de repositorios: `@core/repositories/TESTING.md`
