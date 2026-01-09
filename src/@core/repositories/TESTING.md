# Estrategia de Testing para Repositorios

## Principio Fundamental

**Solo probamos NUESTRA lógica, NO la de TypeORM**

TypeORM ya está probado extensivamente por su equipo. No tiene sentido duplicar esos tests.

## BaseRepository: ¿Qué probar?

### ✅ SÍ Probar

**1. Lógica de conmutación de repositorio (`getRepo()`)**

Esta es NUESTRA lógica personalizada que maneja las transacciones con CLS:

```typescript
protected getRepo(): Repository<T> {
  const contextEntityManager = this.cls.get<EntityManager>(ENTITY_MANAGER_KEY)

  if (
    contextEntityManager &&
    typeof contextEntityManager.getRepository === 'function'
  ) {
    return contextEntityManager.getRepository(this.repository.target)
  }

  return this.repository
}
```

**Tests necesarios:**

- ✅ **Escenario A**: Sin EntityManager en CLS → usa repositorio por defecto
- ✅ **Escenario B**: Con EntityManager en CLS → usa repositorio transaccional
- ✅ **Edge Cases**: CLS devuelve valores inválidos → fallback a repositorio por defecto
- ✅ **Integración**: Conmutación consistente entre múltiples llamadas
- ✅ **Compatibilidad**: Verificar que `@Transactional` funciona correctamente

### ❌ NO Probar

**Métodos que solo delegan a TypeORM:**

```typescript
// ❌ NO probar esto - es código de TypeORM
async findById(id: string): Promise<T | null> {
  return await this.getRepo().findOne({ where: { id } })
}

// ❌ NO probar esto - es código de TypeORM
async save(data: DeepPartial<T>): Promise<T> {
  const createdEntity = this.create(data)
  return await this.getRepo().save(createdEntity)
}

// ❌ NO probar esto - es código de TypeORM
async update(id: string, partialEntity: QueryDeepPartialEntity<T>): Promise<boolean> {
  const result = await this.getRepo().update(id, partialEntity)
  return (result.affected ?? 0) > 0
}
```

**¿Por qué no?**
- Son simples wrappers de TypeORM
- TypeORM ya garantiza que `findOne()`, `save()`, `update()` funcionan
- Nuestros tests solo verificarían que TypeORM funciona (redundante)

## Repositorios Específicos: ¿Qué probar?

Para repositorios que extienden `BaseRepository` (ej: `OrganizationRepository`, `UserRepository`):

### ✅ SÍ Probar

**1. Métodos con lógica SQL personalizada**

```typescript
// ✅ PROBAR - QueryBuilder complejo con join
async countActiveUsers(organizationId: string): Promise<number> {
  return await this.getRepo()
    .createQueryBuilder('org')
    .leftJoin('org.users', 'user')
    .where('org.id = :id', { id: organizationId })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .getCount()
}

// ✅ PROBAR - Búsqueda con múltiples condiciones OR
async findWithFilters(filters: OrganizationFilters): Promise<[OrganizationEntity[], number]> {
  const queryBuilder = this.getRepo()
    .createQueryBuilder('org')
    .where('(org.name ILIKE :search OR org.nit ILIKE :search)', { search })

  // ... más lógica compleja
  return await queryBuilder.getManyAndCount()
}
```

**¿Por qué?**
- Es NUESTRA lógica de negocio
- Puede tener bugs en las condiciones WHERE, joins, etc.
- Es fácil equivocarse con QueryBuilder

**Cómo probarlo:**
- Usa SQLite in-memory para tests de repositorio
- Ejecuta el QueryBuilder real y verifica resultados
- Ver: `src/@core/testing/test-database.helper.ts`

### ❌ NO Probar

**1. Métodos simples que usan métodos genéricos**

```typescript
// ❌ NO NECESARIO - usa findOne genérico
async findByNit(nit: string): Promise<OrganizationEntity | null> {
  return await this.findOne({ nit })
}

// ❌ NO NECESARIO - usa findOne genérico
async findByEmail(email: string): Promise<UserEntity | null> {
  return await this.findOne({ email })
}

// ❌ NO NECESARIO - usa count genérico
async countByOrganization(orgId: string): Promise<number> {
  return await this.count({ organizationId: orgId })
}
```

**¿Por qué no?**
- Solo delegan a métodos genéricos del `BaseRepository`
- La lógica de `findOne()` ya está probada por TypeORM
- El tipo de safety de TypeScript garantiza que los parámetros son correctos

**MEJOR OPCIÓN**: Eliminar estos métodos y usar directamente los genéricos:

```typescript
// En lugar de repository.findByNit(nit)
await repository.findOne({ nit })

// En lugar de repository.findByEmail(email)
await repository.findOne({ email })
```

## Estructura de Tests Recomendada

### BaseRepository Tests (14 tests - ~1 segundo)

```
base.repository.spec.ts
├── Escenario A: Sin transacción (4 tests)
│   ├── CLS devuelve undefined
│   ├── CLS devuelve null
│   ├── Método sincrónico (create)
│   └── Método asíncrono (findById)
├── Escenario B: Con transacción (3 tests)
│   ├── CLS tiene EntityManager
│   ├── Método sincrónico (create)
│   └── Método asíncrono (save)
├── Edge Cases (3 tests)
│   ├── CLS devuelve objeto sin getRepository
│   ├── getRepository no es función
│   └── CLS devuelve objeto vacío
├── Integración (3 tests)
│   ├── Uso consistente en múltiples llamadas
│   ├── Conmutación correcta entre repos
│   └── CLS.get llamado en cada invocación
└── Verificación (1 test)
    └── Compatibilidad con @Transactional
```

### Repositorio Específico Tests (SQLite in-memory)

**SOLO para métodos con QueryBuilder o lógica compleja**

```
organization.repository.spec.ts
└── Métodos complejos
    ├── countActiveUsers() - QueryBuilder con join
    └── findWithFilters() - Búsqueda con OR conditions

user.repository.spec.ts
└── Métodos complejos
    ├── findUsersWithPermissions() - Múltiples joins
    └── aggregateUserStats() - Agregaciones complejas
```

## Comparación: Antes vs Después

### ❌ Antes (Excesivo)

```typescript
describe('findById()', () => {
  it('should find entity by id', async () => {
    // Probando TypeORM, no nuestra lógica
    const result = await repository.findById('123')
    expect(mockRepository.findOne).toHaveBeenCalled()
  })
})

describe('save()', () => {
  it('should save entity', async () => {
    // Probando TypeORM, no nuestra lógica
    const result = await repository.save(data)
    expect(mockRepository.save).toHaveBeenCalled()
  })
})

// ... 30 tests más para cada método CRUD
```

**Problemas:**
- 40+ tests que solo verifican que TypeORM funciona
- Mantenimiento innecesario
- Tiempo de ejecución desperdiciado

### ✅ Después (Eficiente)

```typescript
describe('Escenario A: Sin transacción', () => {
  it('debe usar repositorio por defecto cuando CLS devuelve undefined', () => {
    // Probando NUESTRA lógica de conmutación
    const repo = testRepository.getRepoPublic()
    expect(repo).toBe(mockRepository)
  })

  it('debe usar repositorio por defecto en método real (create)', () => {
    // Verificamos que la conmutación funciona en métodos reales
    testRepository.create(data)
    expect(mockRepository.create).toHaveBeenCalled()
    expect(mockTransactionRepository.create).not.toHaveBeenCalled()
  })
})

describe('Escenario B: Con transacción', () => {
  it('debe usar repositorio transaccional cuando CLS tiene EntityManager', () => {
    // Probando NUESTRA lógica de conmutación
    const repo = testRepository.getRepoPublic()
    expect(repo).toBe(mockTransactionRepository)
  })
})
```

**Beneficios:**
- 14 tests enfocados en nuestra lógica
- Rápidos de ejecutar (<1 segundo)
- Fáciles de mantener
- Si fallan, sabemos que hay un bug REAL

## Ejemplo: BaseRepository Test

```typescript
import { Repository, EntityManager, Entity, Column } from 'typeorm'
import { ClsService } from 'nestjs-cls'
import { BaseRepository } from './base.repository'
import { BaseEntity } from '@core/entities'
import { ENTITY_MANAGER_KEY } from '@core/database'

// Entidad dummy para testing
@Entity('test_entities')
class TestEntity extends BaseEntity {
  @Column()
  name: string
}

// Repository con método público para testing
class TestRepository extends BaseRepository<TestEntity> {
  constructor(repository: Repository<TestEntity>, cls: ClsService) {
    super(repository, cls)
  }

  // Exponemos getRepo para probar directamente
  public getRepoPublic(): Repository<TestEntity> {
    return this.getRepo()
  }
}

describe('BaseRepository - CLS Transaction Switching', () => {
  let mockRepository: any
  let mockClsService: any
  let mockEntityManager: any
  let mockTransactionRepository: any

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      // ... solo los métodos que usaremos
    }

    mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    }

    mockEntityManager = {
      getRepository: jest.fn().mockReturnValue(mockTransactionRepository),
    }

    mockClsService = {
      get: jest.fn().mockReturnValue(undefined),
    }

    testRepository = new TestRepository(mockRepository, mockClsService)
  })

  it('debe usar repositorio por defecto cuando CLS devuelve undefined', () => {
    mockClsService.get.mockReturnValue(undefined)

    const repo = testRepository.getRepoPublic()

    expect(mockClsService.get).toHaveBeenCalledWith(ENTITY_MANAGER_KEY)
    expect(repo).toBe(mockRepository)
  })

  it('debe usar repositorio transaccional cuando CLS tiene EntityManager', () => {
    mockClsService.get.mockReturnValue(mockEntityManager)

    const repo = testRepository.getRepoPublic()

    expect(mockEntityManager.getRepository).toHaveBeenCalledWith(TestEntity)
    expect(repo).toBe(mockTransactionRepository)
  })
})
```

## Ejemplo: Repository Específico Test

```typescript
import { createInMemoryDataSource } from '@core/testing'
import { OrganizationRepository } from './organization.repository'
import { OrganizationEntity } from '../entities/organization.entity'
import { UserEntity } from '../entities/user.entity'

describe('OrganizationRepository (SQLite In-Memory)', () => {
  let repository: OrganizationRepository
  let dataSource: DataSource

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource([
      OrganizationEntity,
      UserEntity,
    ])

    const typeormRepo = dataSource.getRepository(OrganizationEntity)
    const clsService = new ClsService()
    repository = new OrganizationRepository(typeormRepo, clsService)
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  // ✅ Solo probar métodos con QueryBuilder complejo
  describe('countActiveUsers()', () => {
    it('should count only active users with QueryBuilder', async () => {
      // Arrange
      const org = await repository.save({
        name: 'Test Org',
        nit: '123456',
      })

      await dataSource.getRepository(UserEntity).save([
        { name: 'User 1', organizationId: org.id, isActive: true },
        { name: 'User 2', organizationId: org.id, isActive: true },
        { name: 'User 3', organizationId: org.id, isActive: false }, // Inactivo
      ])

      // Act
      const count = await repository.countActiveUsers(org.id)

      // Assert
      expect(count).toBe(2) // Solo los 2 activos
    })
  })

  // ❌ NO probar esto:
  // describe('findById()', () => {}) - Ya está en BaseRepository
  // describe('save()', () => {}) - Ya está en BaseRepository
})
```

## Regla de Oro

> **"Si el método solo llama a TypeORM sin lógica adicional, NO lo pruebes"**

**Ejemplos:**

```typescript
// ❌ NO probar - solo llama a TypeORM
async findById(id: string) {
  return await this.getRepo().findOne({ where: { id } })
}

// ✅ SÍ probar - lógica de negocio compleja
async findActiveUsersWithRoles(orgId: string) {
  return await this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'role')
    .where('user.organizationId = :orgId', { orgId })
    .andWhere('user.isActive = :active', { active: true })
    .andWhere('role.isActive = :active', { active: true })
    .getMany()
}
```

## Ejecutar Tests

```bash
# BaseRepository tests (unitarios, rápidos)
npm test -- base.repository.spec

# Repository tests (con SQLite in-memory)
npm run test:repository

# Todos los tests unitarios
npm run test:unit

# Todos los tests
npm test
```

## Beneficios de esta Estrategia

1. **Menos código de test** - Solo 14 tests para BaseRepository vs 40+ anteriormente
2. **Tests más rápidos** - No ejecutamos operaciones de DB innecesarias
3. **Mayor mantenibilidad** - Si TypeORM cambia, solo actualizamos el código, no los tests
4. **Enfoque en lo importante** - Probamos nuestra lógica, no la de terceros
5. **Mejor señal de fallos** - Si un test falla, es porque HAY un bug en nuestro código

## Conclusión

Esta estrategia de testing:
- ✅ Prueba el 100% de NUESTRA lógica personalizada
- ✅ Confía en que TypeORM funciona (porque está bien probado)
- ✅ Reduce drásticamente el código de test
- ✅ Mejora el mantenimiento
- ✅ Acelera la ejecución de tests

**Resultado:** Tests más valiosos, menos trabajo, mejor confianza.
