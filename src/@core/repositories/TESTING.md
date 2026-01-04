# Testing de Repositorios

Guía para probar `BaseRepository` y repositorios hijos correctamente.

## 🎯 Estrategia de Testing

### 1. **BaseRepository** - Probar UNA VEZ
- Crear un test con una entidad dummy
- Probar TODA la lógica genérica (save, findById, update, etc.)
- Probar integración con CLS

### 2. **Repositorios Hijos** - Solo lógica personalizada
- **NO** probar métodos heredados (save, findById, etc.)
- **SÍ** probar solo métodos personalizados que agregaste
- Mockear las llamadas del BaseRepository

### 3. **Tests de Integración** (Opcional)
- Probar con base de datos real o en memoria
- Verificar transacciones funcionan correctamente

## 📁 Estructura de Tests

```
src/@core/
├── repositories/
│   ├── base.repository.ts
│   ├── base.repository.spec.ts        ← Prueba BaseRepository UNA VEZ
│   └── base-repository.interface.ts
└── examples/
    ├── user.repository.ts
    └── user.repository.spec.ts        ← Solo métodos personalizados
```

## ✅ BaseRepository Test

**¿Qué probar?**
- ✅ `getRepo()` obtiene repository correcto (default vs CLS)
- ✅ Métodos CRUD básicos (save, findById, update, etc.)
- ✅ Integración con CLS (usa EntityManager de transacción)
- ✅ Soft delete y recovery

**Ejemplo:**
```typescript
describe('BaseRepository', () => {
  // Crear entidad dummy para testing
  @Entity('test_entities')
  class TestEntity extends BaseEntity {
    @Column()
    name: string
  }

  class TestRepository extends BaseRepository<TestEntity> {}

  it('should save entity using default repository', async () => {
    const data = { name: 'Test' }
    mockClsService.get.mockReturnValue(undefined) // Sin transacción

    const result = await testRepository.save(data)

    expect(mockRepository.save).toHaveBeenCalled()
  })

  it('should use transaction repository when in CLS', async () => {
    mockClsService.get.mockReturnValue(mockEntityManager)

    await testRepository.save(data)

    expect(mockEntityManager.getRepository).toHaveBeenCalled()
  })
})
```

Ver archivo completo: `base.repository.spec.ts`

## ✅ Repository Hijo Test

**¿Qué probar?**
- ✅ **SOLO** métodos personalizados que agregaste
- ❌ **NO** probar save(), findById(), update() (ya están en BaseRepository)

**Ejemplo - UserRepository:**

```typescript
describe('UserRepository', () => {
  // ⚠️ IMPORTANTE: Solo probamos métodos personalizados

  describe('findByEmail() - método personalizado', () => {
    it('should find user by email', async () => {
      const user = { id: '1', email: 'test@test.com' }
      mockRepository.findOne.mockResolvedValue(user)

      const result = await userRepository.findByEmail('test@test.com')

      expect(result).toBe(user)
    })
  })

  describe('findActiveUsers() - método personalizado', () => {
    it('should find only active users', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([...users])

      const result = await userRepository.findActiveUsers()

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.deletedAt IS NULL'
      )
    })
  })

  // ❌ NO HACER ESTO:
  // describe('save()', () => { ... })  ← Ya está probado en BaseRepository
  // describe('findById()', () => { ... })  ← Ya está probado en BaseRepository
})
```

Ver archivo completo: `user.repository.spec.ts`

## 🔧 Setup de Tests

### Mocks Necesarios

```typescript
let mockRepository: jest.Mocked<Repository<User>>
let mockClsService: jest.Mocked<ClsService>
let mockEntityManager: jest.Mocked<EntityManager>

beforeEach(() => {
  mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    // ... otros métodos que uses
  } as any

  mockClsService = {
    get: jest.fn().mockReturnValue(undefined), // Sin transacción por defecto
  } as any

  mockEntityManager = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  } as any
})
```

### Simular Transacción Activa

```typescript
it('should use transaction when CLS has EntityManager', async () => {
  // Simular que hay una transacción activa
  mockClsService.get.mockReturnValue(mockEntityManager)

  await userRepository.findByEmail('test@test.com')

  // Verificar que se usó el EntityManager de CLS
  expect(mockEntityManager.getRepository).toHaveBeenCalledWith(User)
})
```

## 🧪 Ejecutar Tests

```bash
# Todos los tests
npm test

# Solo tests de repositorios
npm test -- repositories

# Con coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📊 Coverage Esperado

### BaseRepository
- ✅ **100%** de coverage en lógica CRUD
- ✅ Todas las ramas de `getRepo()` cubiertas

### Repositorios Hijos
- ✅ **100%** de coverage en métodos personalizados
- ⚠️ Métodos heredados NO cuentan para coverage (ya están en BaseRepository)

## 🎭 Tipos de Tests

### 1. Tests Unitarios (Recomendado)

**BaseRepository:**
```typescript
// Mockear todo, probar lógica aislada
it('should save entity', async () => {
  mockRepository.save.mockResolvedValue(savedEntity)

  const result = await repository.save(data)

  expect(result).toBe(savedEntity)
})
```

**Repository Hijo:**
```typescript
// Solo probar métodos personalizados
it('should find by email', async () => {
  mockRepository.findOne.mockResolvedValue(user)

  const result = await userRepository.findByEmail(email)

  expect(result).toBe(user)
})
```

### 2. Tests de Integración (Opcional)

Usar base de datos en memoria (SQLite):

```typescript
describe('UserRepository Integration', () => {
  let dataSource: DataSource
  let userRepository: UserRepository

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User],
      synchronize: true,
    }).initialize()

    const repository = dataSource.getRepository(User)
    const clsService = new ClsService()
    userRepository = new UserRepository(repository, clsService)
  })

  it('should save and find user', async () => {
    const user = await userRepository.save({
      email: 'test@test.com',
      name: 'Test'
    })

    const found = await userRepository.findByEmail('test@test.com')

    expect(found?.id).toBe(user.id)
  })
})
```

## 📝 Best Practices

### ✅ DO

```typescript
// 1. Probar BaseRepository con entidad dummy
class TestEntity extends BaseEntity {}
class TestRepository extends BaseRepository<TestEntity> {}

// 2. En repos hijos, solo probar métodos personalizados
describe('findByEmail()', () => {
  // Test específico de UserRepository
})

// 3. Mockear correctamente las dependencias
mockClsService.get.mockReturnValue(undefined)

// 4. Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks()
})
```

### ❌ DON'T

```typescript
// 1. NO probar métodos heredados en repos hijos
describe('UserRepository', () => {
  describe('save()', () => {}) // ❌ Ya está en BaseRepository
  describe('findById()', () => {}) // ❌ Ya está en BaseRepository
})

// 2. NO duplicar tests de BaseRepository
// Si ya está probado en base.repository.spec.ts, no lo pruebes otra vez

// 3. NO olvidar limpiar mocks
// Puede causar tests que pasan pero no deberían
```

## 🔍 Debugging Tests

### Ver qué se está llamando

```typescript
it('should call correct methods', async () => {
  await userRepository.findByEmail('test@test.com')

  // Ver TODAS las llamadas
  console.log(mockRepository.findOne.mock.calls)

  // Ver argumentos de la primera llamada
  console.log(mockRepository.findOne.mock.calls[0])
})
```

### Ver valores de retorno

```typescript
it('should return mocked value', async () => {
  const mockUser = { id: '1', email: 'test@test.com' }
  mockRepository.findOne.mockResolvedValue(mockUser)

  const result = await userRepository.findByEmail('test@test.com')

  console.log('Result:', result)
  console.log('Mock was called:', mockRepository.findOne.mock.calls.length)
})
```

## 📚 Recursos

- Jest Documentation: https://jestjs.io/docs/getting-started
- NestJS Testing: https://docs.nestjs.com/fundamentals/testing
- TypeORM Testing: https://typeorm.io/testing

## 🎯 Checklist

Antes de hacer commit, verifica:

- [ ] BaseRepository tiene tests completos
- [ ] Repos hijos solo prueban métodos personalizados
- [ ] Todos los tests pasan (`npm test`)
- [ ] Coverage es >80% (`npm test -- --coverage`)
- [ ] No hay tests duplicados
- [ ] Mocks se limpian correctamente
- [ ] Tests son rápidos (<1s cada uno)

## 💡 Tips

1. **Usa `describe()` por método** - Facilita encontrar qué test falló
2. **Nombres descriptivos** - `should find user by email when user exists`
3. **Arrange-Act-Assert** - Estructura clara en cada test
4. **Mock solo lo necesario** - No mockear todo si no lo usas
5. **Tests rápidos** - Si un test tarda >1s, probablemente necesita optimización
