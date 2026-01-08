# Estrategias de Testing: Comparación

Comparación de 3 enfoques para testing de Services con sus ventajas y desventajas.

## 📊 Las 3 Estrategias

### 1️⃣ Mock Individual (Tradicional)

```typescript
describe('UsersService (Mocks Individuales)', () => {
  let repository: jest.Mocked<IUsersRepository>

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      save: jest.fn(),
      // ... más mocks
    } as any
  })

  it('should create user', async () => {
    // ❌ Mockear cada función individualmente
    repository.existsByEmail.mockResolvedValue(false)
    repository.existsByUsername.mockResolvedValue(false)
    repository.existsByCI.mockResolvedValue(false)
    repository.save.mockImplementation(async (entity) => ({
      ...entity,
      id: 'generated-id',
    }))

    const result = await service.create(dto)

    expect(result.id).toBe('generated-id')
  })
})
```

**✅ Ventajas:**
- Rápido de escribir inicialmente
- Control total sobre cada función
- Útil para casos específicos

**❌ Desventajas:**
- Tedioso: muchos mocks por test
- Frágil: cambios en repository rompen tests
- No prueba comportamiento real
- Difícil de mantener
- Código repetitivo

**📌 Cuándo usar:**
- Tests muy específicos de una función
- Casos edge muy particulares
- Cuando necesitas controlar exactamente qué retorna cada llamada

---

### 2️⃣ Fake Repository (In-Memory) - ⭐ RECOMENDADO

```typescript
describe('UsersService (Fake Repository)', () => {
  let fakeRepository: FakeUsersRepository

  beforeEach(() => {
    fakeRepository = new FakeUsersRepository() // ✅ Implementación real
  })

  it('should create user', async () => {
    // ✅ Seed con datos iniciales (fixtures)
    fakeRepository.seed([TEST_USERS.ADMIN])

    // ✅ Ejecutar operación
    const result = await service.create(dto)

    // ✅ Verificar resultado REAL
    expect(result.id).toBeDefined()

    // ✅ Verificar que se guardó REALMENTE
    const saved = await fakeRepository.findById(result.id)
    expect(saved).toBeDefined()

    // ✅ Verificar estado del repo
    expect(fakeRepository.count()).toBe(2) // Admin + nuevo
  })

  it('should prevent duplicate emails', async () => {
    // ✅ Seed con usuario existente
    fakeRepository.seed([TEST_USERS.ADMIN])

    const duplicateDto = {
      ...dto,
      email: TEST_USERS.ADMIN.email, // ❌ Duplicado
    }

    // ✅ Validator ejecuta búsqueda REAL en fake repo
    await expect(service.create(duplicateDto)).rejects.toThrow(
      EmailAlreadyExistsException,
    )

    // ✅ Verificar que NO se creó
    expect(fakeRepository.count()).toBe(1)
  })
})
```

**✅ Ventajas:**
- **Más realista:** Comportamiento similar a DB real
- **Más legible:** No mockear función por función
- **Más mantenible:** Cambios en repository no rompen tests
- **Más expresivo:** Puedes hacer queries complejas
- **Reutilizable:** Mismo fake repo en múltiples tests
- **Tests mejores:** Pruebas comportamiento, no implementación

**❌ Desventajas:**
- Requiere implementar el fake repository
- Un poco más de código inicial
- Necesitas mantener el fake sincronizado con la interfaz

**📌 Cuándo usar:** ⭐
- **RECOMENDADO para la mayoría de tests de integración**
- Cuando tienes múltiples operaciones sobre los mismos datos
- Cuando quieres probar flujos completos
- Cuando necesitas validaciones reales

---

### 3️⃣ Base de Datos Real (SQLite en memoria)

```typescript
describe('UsersService (DB Real)', () => {
  let dataSource: DataSource
  let repository: UsersRepository

  beforeEach(async () => {
    // ✅ Crear DB SQLite en memoria
    dataSource = await new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [UserEntity],
      synchronize: true,
    }).initialize()

    repository = dataSource.getRepository(UserEntity)
  })

  afterEach(async () => {
    await dataSource.dropDatabase()
    await dataSource.destroy()
  })

  it('should create user', async () => {
    // ✅ Operación REAL con DB REAL
    const result = await service.create(dto)

    // ✅ Verificar en DB REAL
    const saved = await repository.findOne({ where: { id: result.id } })
    expect(saved).toBeDefined()
  })
})
```

**✅ Ventajas:**
- **100% realista:** Usa TypeORM real
- **Prueba constraints reales:** UNIQUE, FK, etc.
- **Prueba migrations:** Si tienes migrations
- **Más confianza:** Si funciona aquí, funcionará en producción

**❌ Desventajas:**
- **Más lento:** Inicializar DB toma tiempo
- **Más complejo:** Setup y teardown
- **Overkill:** Para tests unitarios/integración simples
- **Dependencia extra:** SQLite

**📌 Cuándo usar:**
- Tests E2E
- Cuando necesitas probar constraints de DB
- Cuando necesitas probar migrations
- CI/CD pipeline (antes de deploy)

---

## 🎯 Comparación Rápida

| Aspecto | Mock Individual | Fake Repo ⭐ | DB Real |
|---------|----------------|-------------|---------|
| **Velocidad** | ⚡⚡⚡ Muy rápido | ⚡⚡ Rápido | ⚡ Lento |
| **Realismo** | ❌ Bajo | ✅ Alto | ✅ Muy alto |
| **Mantenibilidad** | ❌ Difícil | ✅ Fácil | ⚠️ Media |
| **Setup inicial** | ⚡ Mínimo | ⚠️ Medio | ❌ Alto |
| **Legibilidad** | ❌ Baja | ✅ Alta | ✅ Alta |
| **Detección bugs** | ❌ Baja | ✅ Alta | ✅ Muy alta |

---

## 📖 Ejemplo Comparativo Completo

### Escenario: Crear usuario y verificar que no permite duplicados

#### ❌ Enfoque 1: Mock Individual (Tedioso)

```typescript
it('should prevent duplicate email', async () => {
  // Setup inicial: mockear TODO
  repository.existsByEmail.mockResolvedValueOnce(false) // Primera llamada OK
  repository.existsByUsername.mockResolvedValue(false)
  repository.existsByCI.mockResolvedValue(false)
  repository.save.mockImplementation(async (e) => ({ ...e, id: '1' }))

  // Crear primer usuario
  await service.create(dto1)

  // Mockear para segundo intento (duplicado)
  repository.existsByEmail.mockResolvedValueOnce(true) // ❌ Email duplicado
  repository.existsByUsername.mockResolvedValue(false)
  repository.existsByCI.mockResolvedValue(false)

  // Intentar crear duplicado
  await expect(service.create(dto2)).rejects.toThrow(EmailAlreadyExistsException)
})
```

**Problemas:**
- 7 líneas de mocks
- Difícil de entender qué está pasando
- Fácil cometer errores
- No prueba que el validator REALMENTE busca en el repo

#### ✅ Enfoque 2: Fake Repository (Elegante)

```typescript
it('should prevent duplicate email', async () => {
  // Crear primer usuario (se guarda REALMENTE en fake repo)
  await service.create(dto1)

  // Intentar crear duplicado (validator busca REALMENTE en fake repo)
  await expect(service.create(dto2)).rejects.toThrow(EmailAlreadyExistsException)

  // Verificar estado final
  expect(fakeRepository.count()).toBe(1) // Solo un usuario
})
```

**Ventajas:**
- 3 líneas vs 7 líneas
- Mucho más claro qué está pasando
- Prueba comportamiento REAL
- Fácil de mantener

#### ✅ Enfoque 3: DB Real (Más realista)

```typescript
it('should prevent duplicate email', async () => {
  // Crear primer usuario (se guarda en SQLite)
  await service.create(dto1)

  // Intentar crear duplicado (constraint UNIQUE de DB real)
  await expect(service.create(dto2)).rejects.toThrow(EmailAlreadyExistsException)

  // Verificar en DB real
  const users = await repository.find()
  expect(users).toHaveLength(1)
})
```

**Ventajas:**
- Prueba constraint UNIQUE real de PostgreSQL/SQLite
- 100% de confianza

---

## 🛠️ Cómo Implementar Fake Repository

### Paso 1: Crear la interfaz

```typescript
// users-repository.interface.ts
export interface IUsersRepository {
  save(user: Partial<UserEntity>): Promise<UserEntity>
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  existsByEmail(email: string, excludeId?: string): Promise<boolean>
  // ... más métodos
}
```

### Paso 2: Implementar Fake Repository

```typescript
// fake-users.repository.ts
export class FakeUsersRepository implements IUsersRepository {
  private users: Map<string, UserEntity> = new Map()
  private currentId = 1

  async save(user: Partial<UserEntity>): Promise<UserEntity> {
    if (!user.id) {
      user.id = `user-${this.currentId++}`
    }
    const savedUser = user as UserEntity
    this.users.set(savedUser.id, { ...savedUser })
    return { ...savedUser }
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id)
    return user ? { ...user } : null
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email === email && user.id !== excludeId) {
        return true
      }
    }
    return false
  }

  // Método helper para tests
  clear(): void {
    this.users.clear()
    this.currentId = 1
  }

  seed(users: UserEntity[]): void {
    users.forEach(u => this.users.set(u.id, { ...u }))
  }
}
```

### Paso 3: Crear Fixtures (Datos de prueba)

```typescript
// user.fixtures.ts
export const TEST_USERS = {
  ADMIN: {
    id: 'user-admin',
    email: 'admin@test.com',
    username: 'admin',
    roles: [Role.ADMIN],
    // ... más campos
  } as UserEntity,

  AUDITOR: {
    id: 'user-auditor',
    email: 'auditor@test.com',
    username: 'auditor',
    roles: [Role.AUDITOR],
  } as UserEntity,
}

// Builder pattern
export class UserBuilder {
  private user: Partial<UserEntity> = {}

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  build(): UserEntity {
    return { ...defaultUser, ...this.user } as UserEntity
  }
}
```

### Paso 4: Usar en Tests

```typescript
describe('UsersService', () => {
  let fakeRepository: FakeUsersRepository

  beforeEach(() => {
    fakeRepository = new FakeUsersRepository()
  })

  it('should work with fixtures', async () => {
    // ✅ Seed con datos predefinidos
    fakeRepository.seed([TEST_USERS.ADMIN, TEST_USERS.AUDITOR])

    const users = await service.findAll()
    expect(users).toHaveLength(2)
  })

  it('should work with builder', async () => {
    // ✅ Crear datos custom
    const user = new UserBuilder()
      .withEmail('custom@test.com')
      .withRoles([Role.ADMIN])
      .build()

    fakeRepository.seed([user])

    const found = await service.findByEmail('custom@test.com')
    expect(found).toBeDefined()
  })
})
```

---

## 🎯 Recomendación por Tipo de Test

### Tests Unitarios (Factory, Validator, Utils)
```
✅ Sin mocks o mocks mínimos
✅ Funciones puras, lógica aislada
```

### Tests de Integración (Service)
```
⭐ Fake Repository (RECOMENDADO)
✅ Mock solo infraestructura (Files, Email)
✅ Instancias reales de lógica de negocio
```

### Tests E2E (Flujos completos)
```
✅ DB Real (SQLite en memoria)
✅ Desde HTTP hasta DB
```

---

## 📊 Pirámide de Testing Aplicada

```
         /\
        /E2\     ← DB Real (Pocos, lentos, completos)
       /____\
      /      \
     / Integ \  ← Fake Repository (Muchos, rápidos)
    /__________\
   /            \
  /   Unitarios  \ ← Sin mocks (Muchísimos, instantáneos)
 /________________\
```

---

## 💡 Tips Finales

### ✅ DO

1. **Usa Fake Repository para Service tests**
   ```typescript
   const fakeRepo = new FakeUsersRepository()
   fakeRepo.seed([TEST_USERS.ADMIN])
   ```

2. **Crea fixtures reutilizables**
   ```typescript
   export const TEST_USERS = { ADMIN: {...}, AUDITOR: {...} }
   ```

3. **Usa Builder pattern para variaciones**
   ```typescript
   new UserBuilder().withEmail('test@test.com').admin().build()
   ```

### ❌ DON'T

1. **No uses mocks individuales para todo**
   ```typescript
   // ❌ Tedioso
   repository.findById.mockResolvedValue(...)
   repository.save.mockImplementation(...)
   ```

2. **No uses DB real para tests unitarios**
   ```typescript
   // ❌ Overkill y lento
   beforeEach(async () => {
     await dataSource.initialize()
   })
   ```

3. **No dupliques datos en cada test**
   ```typescript
   // ❌ Repetitivo
   const user = { id: '1', email: 'test@test.com', ... }
   // ✅ Usa fixtures
   fakeRepo.seed([TEST_USERS.ADMIN])
   ```

---

## 🚀 Migración Gradual

### Fase 1: Crear infraestructura
- [ ] Crear `FakeUsersRepository`
- [ ] Crear fixtures (`TEST_USERS`)
- [ ] Crear `UserBuilder`

### Fase 2: Migrar un test
- [ ] Tomar un test existente con mocks
- [ ] Reescribirlo con fake repository
- [ ] Comparar legibilidad y mantenibilidad

### Fase 3: Expandir
- [ ] Migrar más tests
- [ ] Aplicar a otros módulos (Organizations, etc.)
- [ ] Documentar aprendizajes

---

**Conclusión:** Fake Repository es el punto óptimo entre velocidad, realismo y mantenibilidad para tests de integración. ⭐
