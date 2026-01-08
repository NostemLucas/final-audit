# Ejemplo Visual: Mock vs Fake Repository

Comparación lado a lado del MISMO test con diferentes enfoques.

## 🎯 Test: Crear usuario y verificar que no permite email duplicado

---

### ❌ Enfoque 1: Mock Individual (Tradicional)

```typescript
it('should prevent duplicate email', async () => {
  // ❌ Setup: Mockear CADA función
  repository.existsByEmail.mockResolvedValueOnce(false)  // 1ra llamada
  repository.existsByUsername.mockResolvedValue(false)
  repository.existsByCI.mockResolvedValue(false)
  repository.save.mockImplementation(async (entity) => ({
    ...entity,
    id: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  // Crear primer usuario
  const user1 = await service.create({
    email: 'juan@test.com',
    username: 'juan',
    ci: '12345678',
    password: 'Pass123!',
    // ... más campos
  })

  // ❌ Re-mockear para segundo intento
  repository.existsByEmail.mockResolvedValueOnce(true)  // 2da llamada (duplicado)
  repository.existsByUsername.mockResolvedValue(false)
  repository.existsByCI.mockResolvedValue(false)

  // Intentar crear duplicado
  await expect(service.create({
    email: 'juan@test.com',  // ❌ Email duplicado
    username: 'pedro',
    ci: '87654321',
    password: 'Pass123!',
    // ...
  })).rejects.toThrow(EmailAlreadyExistsException)

  // ❌ No podemos verificar estado final del repo fácilmente
}

// Líneas de código: ~30
// Mocks necesarios: 7+
// Legibilidad: Baja
// Mantenibilidad: Baja
```

---

### ✅ Enfoque 2: Fake Repository (RECOMENDADO)

```typescript
it('should prevent duplicate email', async () => {
  // ✅ Crear primer usuario (se guarda REALMENTE en fake repo)
  const user1 = await service.create({
    email: 'juan@test.com',
    username: 'juan',
    ci: '12345678',
    password: 'Pass123!',
    // ...
  })

  // ✅ Intentar crear duplicado (validator busca REALMENTE en fake repo)
  await expect(service.create({
    email: 'juan@test.com',  // ❌ Email duplicado
    username: 'pedro',
    ci: '87654321',
    password: 'Pass123!',
    // ...
  })).rejects.toThrow(EmailAlreadyExistsException)

  // ✅ Verificar estado final del repo
  expect(fakeRepository.count()).toBe(1)  // Solo un usuario
  const allUsers = await fakeRepository.findAll()
  expect(allUsers[0].email).toBe('juan@test.com')
}

// Líneas de código: ~15 (50% menos!)
// Mocks necesarios: 0
// Legibilidad: Alta
// Mantenibilidad: Alta
```

---

## 📊 Comparación con Fixtures

### ❌ Sin Fixtures (Repetitivo)

```typescript
it('test 1', async () => {
  const user = {
    id: '1',
    names: 'Juan',
    lastNames: 'Pérez',
    email: 'juan@test.com',
    username: 'juan',
    ci: '12345678',
    password: bcrypt.hashSync('Pass123!', 10),
    phone: '71234567',
    address: 'Calle Test',
    organizationId: 'org-1',
    roles: [Role.AUDITOR],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  }
  fakeRepository.seed([user])
  // ... test
})

it('test 2', async () => {
  // ❌ Repetir TODO otra vez
  const user = {
    id: '1',
    names: 'Juan',
    // ... TODO de nuevo
  }
  // ...
})
```

### ✅ Con Fixtures (DRY - Don't Repeat Yourself)

```typescript
// user.fixtures.ts
export const TEST_USERS = {
  ADMIN: {
    id: 'user-admin',
    names: 'Admin',
    email: 'admin@test.com',
    // ... todos los campos
  } as UserEntity,

  AUDITOR: {
    id: 'user-auditor',
    names: 'Juan',
    email: 'juan@test.com',
    // ... todos los campos
  } as UserEntity,
}

// tests
it('test 1', async () => {
  fakeRepository.seed([TEST_USERS.AUDITOR])  // ✅ Una línea!
  // ...
})

it('test 2', async () => {
  fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR])  // ✅ Fácil
  // ...
})
```

---

## 🏗️ Builder Pattern para Casos Custom

### Sin Builder

```typescript
it('should handle user with specific org', async () => {
  const user = {
    id: 'user-1',
    names: 'Test',
    lastNames: 'User',
    email: 'test@test.com',
    username: 'testuser',
    ci: '12345678',
    password: bcrypt.hashSync('Pass123!', 10),
    phone: null,
    address: null,
    organizationId: 'org-specific',  // ← Solo esto cambia
    roles: [Role.USUARIO],
    status: UserStatus.ACTIVE,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  }
  // ❌ Repetir 15+ líneas para cambiar UNA cosa
})
```

### ✅ Con Builder

```typescript
it('should handle user with specific org', async () => {
  const user = new UserBuilder()
    .withOrganization('org-specific')  // ✅ Solo lo que cambia
    .build()

  fakeRepository.seed([user])
  // ...
})

it('should handle admin user', async () => {
  const user = new UserBuilder()
    .withEmail('admin@test.com')
    .admin()  // ✅ Helper para roles
    .build()
  // ...
})

it('should handle inactive user', async () => {
  const user = new UserBuilder()
    .withEmail('inactive@test.com')
    .inactive()  // ✅ Helper para status
    .build()
  // ...
})
```

---

## 🎬 Escenario Complejo: Múltiples Operaciones

### ❌ Con Mocks (Pesadilla)

```typescript
it('should create, update, and query users', async () => {
  // ❌ Mock para CREATE
  repository.existsByEmail.mockResolvedValueOnce(false)
  repository.save.mockImplementationOnce(async (e) => ({ ...e, id: '1' }))

  const user1 = await service.create(dto1)

  // ❌ Mock para UPDATE
  repository.findById.mockResolvedValueOnce(user1)
  repository.existsByEmail.mockResolvedValueOnce(false)
  repository.save.mockImplementationOnce(async (e) => ({ ...e }))

  const updated = await service.update('1', updateDto)

  // ❌ Mock para FIND BY EMAIL
  repository.findByEmail.mockResolvedValueOnce(updated)

  const found = await service.findByEmail('updated@test.com')

  // ❌ Mock para FIND BY ORG
  repository.findByOrganization.mockResolvedValueOnce([updated])

  const orgUsers = await service.findByOrganization('org-1')

  // ... 20+ líneas de mocks
  // ... difícil de seguir qué está pasando
}
```

### ✅ Con Fake Repository (Claro y Simple)

```typescript
it('should create, update, and query users', async () => {
  // ✅ Crear (se guarda REALMENTE)
  const user1 = await service.create(dto1)

  // ✅ Actualizar (se actualiza REALMENTE)
  const updated = await service.update(user1.id, updateDto)

  // ✅ Buscar por email (busca REALMENTE)
  const found = await service.findByEmail('updated@test.com')
  expect(found!.id).toBe(user1.id)

  // ✅ Buscar por org (busca REALMENTE)
  const orgUsers = await service.findByOrganization('org-1')
  expect(orgUsers).toContainEqual(expect.objectContaining({ id: user1.id }))

  // ✅ Verificar estado final
  expect(fakeRepository.count()).toBe(1)
}

// ✅ Mucho más claro qué está pasando
// ✅ Sin mocks complejos
// ✅ Comportamiento REAL
```

---

## 📈 Estadísticas: Mock vs Fake Repository

| Métrica | Mock Individual | Fake Repository |
|---------|----------------|-----------------|
| **Líneas por test** | 25-40 | 10-20 |
| **Setup por test** | 5-10 líneas mocks | 1-2 líneas seed |
| **Legibilidad** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mantenibilidad** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Detección bugs** | ⭐⭐ | ⭐⭐⭐⭐ |
| **Velocidad ejecución** | ⚡⚡⚡ | ⚡⚡⚡ |
| **Realismo** | ⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Resultado de Tests

### Mock Individual
```bash
Test Suites: 1 passed
Tests:       33 passed
Time:        ~2s
Líneas de código: ~800
```

### Fake Repository
```bash
Test Suites: 1 passed
Tests:       12 passed  (con más cobertura!)
Time:        ~2s
Líneas de código: ~400  (50% menos!)
```

---

## 💡 Resumen Visual

```
Mock Individual:
┌─────────────────────────────────────┐
│ repository.findById.mock...         │ ← 5 líneas
│ repository.save.mock...             │
│ repository.existsByEmail.mock...    │
│ // ... más mocks                    │
├─────────────────────────────────────┤
│ await service.create(dto)           │ ← 1 línea
├─────────────────────────────────────┤
│ repository.findById.mock...         │ ← 5 líneas más
│ repository.save.mock...             │
│ // ... mockear otra vez             │
├─────────────────────────────────────┤
│ expect(result).toBe(...)            │ ← 1 línea
└─────────────────────────────────────┘
Total: ~12 líneas (mayoría mocks)

Fake Repository:
┌─────────────────────────────────────┐
│ fakeRepo.seed([TEST_USERS.ADMIN])   │ ← 1 línea
├─────────────────────────────────────┤
│ await service.create(dto)           │ ← 1 línea
│ await service.update(id, updateDto) │ ← 1 línea
│ const found = await service.find... │ ← 1 línea
├─────────────────────────────────────┤
│ expect(found).toBeDefined()         │ ← 1 línea
│ expect(fakeRepo.count()).toBe(2)    │ ← 1 línea
└─────────────────────────────────────┘
Total: ~6 líneas (mayoría lógica de negocio)
```

---

## 🚀 Conclusión

**Fake Repository es como tener una mini base de datos en memoria:**

✅ **Comportamiento real** sin la complejidad de una DB real
✅ **Tests más cortos** y legibles
✅ **Más fácil de mantener** cuando cambia la interfaz
✅ **Detecta más bugs** porque prueba comportamiento real

**Cuándo usar cada uno:**

- **Mock Individual:** Tests muy específicos, casos edge puntuales
- **Fake Repository:** ⭐ La mayoría de tests de integración
- **DB Real:** Tests E2E, CI/CD, antes de deploy

**Próximo paso:** Implementa `FakeOrganizationsRepository` siguiendo el mismo patrón! 🎯
