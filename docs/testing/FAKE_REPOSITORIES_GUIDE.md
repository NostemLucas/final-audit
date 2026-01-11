# Guía de Fake Repositories

## ¿Por qué Fake Repositories en lugar de Mocks?

### ❌ Problema con Mocks

```typescript
// ❌ Mucho código repetitivo y frágil
it('should find organization by NIT', async () => {
  mockRepository.findOne.mockResolvedValue(expectedOrg)

  const result = await service.findByNit('123')

  expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { nit: '123' } })
  expect(result).toBe(expectedOrg)
})

// ❌ Si cambias la implementación, todos los tests fallan
it('should find active organizations', async () => {
  mockRepository.find.mockResolvedValue([org1, org2])
  // ... más código de mock
})
```

### ✅ Solución con Fake Repository

```typescript
// ✅ Comportamiento REAL en memoria
it('should find organization by NIT', async () => {
  fakeRepo.seed([TEST_ORGS.COCA_COLA, TEST_ORGS.PEPSI])

  const result = await service.findByNit('123')

  expect(result.name).toBe('Coca Cola')
})

// ✅ Si cambias la implementación, los tests siguen pasando
it('should find active organizations', async () => {
  fakeRepo.seed([TEST_ORGS.COCA_COLA, TEST_ORGS.PEPSI])

  const result = await service.findAll()

  expect(result).toHaveLength(2)
})
```

## Características de un Buen Fake Repository

### 1. Almacenamiento en Memoria

```typescript
export class FakeOrganizationsRepository implements IOrganizationRepository {
  private organizations: Map<string, OrganizationEntity> = new Map()
  private currentId = 1

  // Limpieza entre tests
  clear(): void {
    this.organizations.clear()
    this.currentId = 1
  }

  // Datos de prueba pre-configurados
  seed(organizations: OrganizationEntity[]): void {
    organizations.forEach((org) => {
      this.organizations.set(org.id, { ...org })
    })
  }
}
```

### 2. Comportamiento Realista

```typescript
async save(data: DeepPartial<OrganizationEntity>): Promise<OrganizationEntity> {
  // ✅ Genera ID automáticamente
  if (!data.id) {
    data.id = `org-${this.currentId++}`
  }

  // ✅ Simula timestamps
  const now = new Date()
  if (!data.createdAt) {
    data.createdAt = now
  }
  data.updatedAt = now

  // ✅ Almacena en memoria
  const savedOrg = data as OrganizationEntity
  this.organizations.set(savedOrg.id, { ...savedOrg })

  // ✅ Retorna copia para evitar mutaciones
  return { ...savedOrg }
}
```

### 3. Respeta Soft Deletes

```typescript
async findById(id: string): Promise<OrganizationEntity | null> {
  const org = this.organizations.get(id)
  // ✅ No retorna entidades eliminadas
  return org && !org.deletedAt ? { ...org } : null
}

async softDelete(id: string): Promise<boolean> {
  const org = this.organizations.get(id)
  if (!org) return false

  // ✅ Marca como eliminado en lugar de eliminar
  org.deletedAt = new Date()
  return true
}

async recover(id: string): Promise<boolean> {
  const org = this.organizations.get(id)
  if (!org) return false

  // ✅ Restaura eliminados
  org.deletedAt = null
  return true
}
```

## Estructura de Archivos

```
src/modules/organizations/
├── __tests__/
│   ├── fixtures/
│   │   ├── fake-organizations.repository.ts    ← Fake repository
│   │   ├── test-organizations.data.ts          ← Datos de prueba
│   │   └── index.ts
│   └── ...
├── repositories/
│   ├── organization.repository.ts
│   └── organization-repository.interface.ts
└── services/
    ├── organizations.service.ts
    └── organizations.service.spec.ts           ← Usa fake repo
```

## Datos de Prueba Pre-configurados

```typescript
// src/modules/organizations/__tests__/fixtures/test-organizations.data.ts
export const TEST_ORGANIZATIONS = {
  COCA_COLA: {
    id: 'org-1',
    name: 'Coca Cola Bolivia',
    nit: '1234567890',
    description: 'Empresa de bebidas',
    address: 'La Paz',
    phone: '71234567',
    email: 'coca@cola.bo',
    logoUrl: '/logos/coca.png',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },

  PEPSI: {
    id: 'org-2',
    name: 'Pepsi Bolivia',
    nit: '9876543210',
    description: 'Otra empresa de bebidas',
    address: 'Santa Cruz',
    phone: '72234567',
    email: 'pepsi@pepsi.bo',
    logoUrl: null,
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  },

  INACTIVE_ORG: {
    id: 'org-3',
    name: 'Inactive Company',
    nit: '1111111111',
    description: 'Empresa inactiva',
    address: 'Cochabamba',
    phone: '73234567',
    email: 'inactive@test.com',
    logoUrl: null,
    isActive: false,  // ❌ Inactiva
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    deletedAt: null,
  },
} as const
```

## Uso en Tests de Servicios

### Setup Básico

```typescript
import { FakeOrganizationsRepository } from './__tests__/fixtures'
import { TEST_ORGANIZATIONS } from './__tests__/fixtures/test-organizations.data'
import { OrganizationsService } from './organizations.service'

describe('OrganizationsService', () => {
  let service: OrganizationsService
  let fakeRepo: FakeOrganizationsRepository
  let mockValidator: any
  let mockFactory: any

  beforeEach(() => {
    // ✅ Crear fake repository
    fakeRepo = new FakeOrganizationsRepository()

    // ✅ Mocks simples para dependencias
    mockValidator = {
      validateUniqueConstraints: jest.fn(),
      validateUniqueName: jest.fn(),
      validateUniqueNit: jest.fn(),
    }

    mockFactory = {
      createFromDto: jest.fn((dto) => dto),
      updateFromDto: jest.fn((org, dto) => ({ ...org, ...dto })),
    }

    // ✅ Inyectar fake repository
    service = new OrganizationsService(
      fakeRepo,
      mockValidator,
      mockFactory,
      mockFilesService,
    )
  })

  afterEach(() => {
    // ✅ Limpiar entre tests
    fakeRepo.clear()
  })

  // ... tests
})
```

### Ejemplos de Tests

```typescript
describe('findAll()', () => {
  it('should return all active organizations', async () => {
    // Arrange - Seed datos de prueba
    fakeRepo.seed([
      TEST_ORGANIZATIONS.COCA_COLA,
      TEST_ORGANIZATIONS.PEPSI,
      TEST_ORGANIZATIONS.INACTIVE_ORG,
    ])

    // Act
    const result = await service.findAll()

    // Assert - Solo retorna activas
    expect(result).toHaveLength(2)
    expect(result.some(o => o.name === 'Coca Cola Bolivia')).toBe(true)
    expect(result.some(o => o.name === 'Inactive Company')).toBe(false)
  })

  it('should return empty array when no organizations', async () => {
    // No seed - base de datos vacía
    const result = await service.findAll()

    expect(result).toEqual([])
  })
})

describe('findByNit()', () => {
  it('should find organization by NIT', async () => {
    // Arrange
    fakeRepo.seed([TEST_ORGANIZATIONS.COCA_COLA])

    // Act
    const result = await service.findByNit('1234567890')

    // Assert
    expect(result.name).toBe('Coca Cola Bolivia')
    expect(result.nit).toBe('1234567890')
  })

  it('should throw when organization not found', async () => {
    // Base vacía
    await expect(service.findByNit('nonexistent'))
      .rejects
      .toThrow(OrganizationNotFoundException)
  })
})

describe('create()', () => {
  it('should create new organization', async () => {
    // Arrange
    const createDto = {
      name: 'New Company',
      nit: '5555555555',
      description: 'Test',
      address: 'Test',
      phone: '75555555',
      email: 'new@test.com',
    }

    // Act
    const result = await service.create(createDto)

    // Assert
    expect(result.id).toBeDefined()  // ✅ ID generado automáticamente
    expect(result.name).toBe('New Company')
    expect(result.createdAt).toBeInstanceOf(Date)  // ✅ Timestamp generado

    // Verificar que está en el repositorio
    const found = await fakeRepo.findById(result.id)
    expect(found).toBeDefined()
  })
})

describe('remove()', () => {
  it('should soft delete organization', async () => {
    // Arrange
    fakeRepo.seed([TEST_ORGANIZATIONS.COCA_COLA])

    // Act
    await service.remove('org-1')

    // Assert
    const found = await fakeRepo.findById('org-1')
    expect(found).toBeNull()  // ✅ No aparece en findById (soft deleted)

    // Pero sigue existiendo en memoria
    expect(fakeRepo['organizations'].get('org-1')).toBeDefined()
    expect(fakeRepo['organizations'].get('org-1').deletedAt).toBeInstanceOf(Date)
  })
})
```

## Ventajas vs Mocks

### 1. Menos Código

| Mocks | Fake Repository |
|-------|-----------------|
| 50+ líneas de mocks por test | 3-5 líneas de setup |
| Mock de cada método | Comportamiento real |
| Verificación de llamadas | Verificación de estado |

### 2. Más Mantenible

```typescript
// ❌ Con mocks - Si cambias el método, rompes todos los tests
mockRepository.findOne.mockImplementation(...)
mockRepository.find.mockImplementation(...)
// ... 20 líneas más

// ✅ Con fake - Si cambias el método, tests siguen pasando
fakeRepo.seed([TEST_ORGS.COCA_COLA])
// La implementación interna no importa
```

### 3. Tests más Legibles

```typescript
// ❌ Con mocks - ¿Qué está probando?
expect(mockRepository.findOne).toHaveBeenCalledWith({
  where: { nit: '123', isActive: true },
  relations: ['users'],
})

// ✅ Con fake - Claro y directo
const result = await service.findByNit('123')
expect(result.name).toBe('Coca Cola')
```

### 4. Detecta Bugs Reales

```typescript
// ❌ Mock puede pasar pero el código está mal
mockRepo.findOne.mockResolvedValue(org)  // Siempre retorna org
// Aunque el query esté mal, el test pasa

// ✅ Fake detecta bugs
fakeRepo.seed([org1])
const result = await service.findByNit('wrong-nit')
// Retorna null si no existe - comportamiento real
```

## Cuándo Usar Qué

### ✅ Usar Fake Repositories

- Tests de **servicios** (lógica de negocio)
- Tests de **casos de uso**
- Tests de **controladores** (con servicios)
- Cuando necesitas **comportamiento realista**

### ✅ Usar Mocks Simples

- Tests **unitarios puros** (sin dependencias)
- Servicios externos (Email, Files, HTTP)
- Dependencias que no son repositorios

### ❌ NO Usar para Repositorios

- ~~Tests con SQLite in-memory~~ (PostgreSQL ≠ SQLite)
- ~~Mocks complejos de QueryBuilder~~ (frágiles)
- ~~Tests de métodos simples~~ (innecesarios)

## Checklist para Crear Fake Repository

- [ ] Implementa `IBaseRepository<T>`
- [ ] Usa `Map<string, T>` para almacenamiento
- [ ] Método `clear()` para limpiar entre tests
- [ ] Método `seed(data[])` para datos pre-configurados
- [ ] Genera IDs automáticamente
- [ ] Simula timestamps (createdAt, updatedAt)
- [ ] Respeta soft deletes
- [ ] Retorna copias (no referencias) para evitar mutaciones
- [ ] Documenta con ejemplos de uso

## Resumen

**Fake Repositories** = Implementación en memoria que simula el comportamiento real de la base de datos.

**Beneficios:**
- ✅ Menos código
- ✅ Más mantenible
- ✅ Tests más legibles
- ✅ Detecta bugs reales
- ✅ Sin dependencias de DB

**Cuándo usarlos:**
- ✅ Tests de servicios
- ✅ Tests de lógica de negocio
- ✅ Cuando necesitas comportamiento realista

**Resultado:** Tests más valiosos, menos trabajo, mejor confianza.
