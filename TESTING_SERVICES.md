# Guía de Testing para Services

Estrategia de mejora incremental para tests más confiables sin reescribir todo.

## 🎯 Problema Actual

```typescript
// ❌ PROBLEMA: Mockeamos TODO
const mockRepository = { save: jest.fn(), findById: jest.fn() }
const mockValidator = { validateUnique: jest.fn() }
const mockFactory = { createFromDto: jest.fn() }

// El test solo verifica "se llamó X con Y"
// NO prueba que la lógica funciona
```

**¿Qué pasa si hay un bug en el Validator o Factory?** → ❌ **El test no lo detecta**

## ✅ Solución: Reducir Mocks Gradualmente

### Regla de Oro

**Solo mockear:**
1. ✅ **Infraestructura externa** (DB, filesystem, network, email)
2. ✅ **Dependencias fuera del alcance** (servicios de terceros)

**NO mockear:**
1. ❌ **Lógica de negocio** (Validators, Factories, Transformers)
2. ❌ **Cálculos y validaciones** (la lógica que queremos probar)

## 📊 Niveles de Testing

### Nivel 1: Tests Unitarios Puros
**Target:** Validators, Factories, Utils (lógica pura sin I/O)

```typescript
// ✅ Test unitario de Validator (sin mocks o mock mínimo)
describe('OrganizationValidator', () => {
  let validator: OrganizationValidator
  let repository: jest.Mocked<IOrganizationRepository> // Solo mock del repo

  beforeEach(() => {
    repository = {
      findByName: jest.fn(),
      findByNit: jest.fn(),
    } as any

    validator = new OrganizationValidator(repository) // ✅ INSTANCIA REAL
  })

  describe('validateUniqueName', () => {
    it('should throw when name already exists', async () => {
      // Arrange
      repository.findByName.mockResolvedValue({
        id: '1',
        name: 'Existing Org',
      } as any)

      // Act & Assert
      await expect(
        validator.validateUniqueName('Existing Org', undefined),
      ).rejects.toThrow('Ya existe una organización con el nombre "Existing Org"')
    })

    it('should pass when name is unique', async () => {
      // Arrange
      repository.findByName.mockResolvedValue(null)

      // Act & Assert
      await expect(
        validator.validateUniqueName('New Org', undefined),
      ).resolves.toBeUndefined()
    })

    it('should pass when updating same organization', async () => {
      // Arrange
      repository.findByName.mockResolvedValue({
        id: '1',
        name: 'My Org',
      } as any)

      // Act & Assert (mismo ID = mismo registro)
      await expect(
        validator.validateUniqueName('My Org', '1'),
      ).resolves.toBeUndefined()
    })
  })
})
```

### Nivel 2: Tests de Integración (Services)
**Target:** OrganizationsService, UsersService, etc.

#### Enfoque A: Reducir Mocks (Recomendado para mejora incremental)

```typescript
// ✅ MEJOR: Solo mockear Repository (infraestructura)
describe('OrganizationsService (Integration)', () => {
  let service: OrganizationsService
  let repository: jest.Mocked<IOrganizationRepository>
  let validator: OrganizationValidator     // ✅ REAL
  let factory: OrganizationFactory         // ✅ REAL
  let filesService: jest.Mocked<FilesService> // Mock (I/O)

  beforeEach(() => {
    // Mock solo el repository (representa la DB)
    repository = {
      save: jest.fn(),
      findByName: jest.fn(),
      findByNit: jest.fn(),
      findActiveById: jest.fn(),
      findAllActive: jest.fn(),
      // ... otros métodos
    } as any

    // Instancias REALES de lógica de negocio
    validator = new OrganizationValidator(repository)
    factory = new OrganizationFactory()

    // Mock de I/O externo
    filesService = {
      uploadFile: jest.fn(),
      replaceFile: jest.fn(),
      deleteFile: jest.fn(),
    } as any

    // Service con dependencias mixtas (reales + mocks)
    service = new OrganizationsService(
      repository,
      validator,
      factory,
      filesService,
    )
  })

  describe('create', () => {
    it('should create organization with real validation and transformation', async () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'New Organization',
        nit: '123456789',
        description: 'Test description',
        address: 'Test address',
        phone: '1234567',
        email: 'test@test.com',
      }

      // Mock repository responses
      repository.findByName.mockResolvedValue(null) // Nombre único
      repository.findByNit.mockResolvedValue(null)  // NIT único
      repository.save.mockImplementation(async (entity) => ({
        ...entity,
        id: 'generated-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      // Act
      const result = await service.create(dto)

      // Assert - Verificar el COMPORTAMIENTO real
      expect(result.id).toBe('generated-id')
      expect(result.name).toBe(dto.name)
      expect(result.nit).toBe(dto.nit)
      expect(result.isActive).toBe(true) // ✅ Factory lo setea automáticamente
      expect(repository.save).toHaveBeenCalledTimes(1)

      // Verificar que se validó correctamente
      expect(repository.findByName).toHaveBeenCalledWith(dto.name)
      expect(repository.findByNit).toHaveBeenCalledWith(dto.nit)
    })

    it('should throw error when name already exists (real validation)', async () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Existing Org',
        nit: '123456789',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      repository.findByName.mockResolvedValue({
        id: '1',
        name: 'Existing Org',
      } as any)

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(
        'Ya existe una organización con el nombre "Existing Org"',
      )

      // Verificar que NO se intentó guardar
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should throw error when NIT already exists (real validation)', async () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'New Org',
        nit: '123456789',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      repository.findByName.mockResolvedValue(null)
      repository.findByNit.mockResolvedValue({
        id: '1',
        nit: '123456789',
      } as any)

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(
        'Ya existe una organización con el NIT "123456789"',
      )

      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    const existingOrg = {
      id: '1',
      name: 'Original Name',
      nit: '123456789',
      description: 'Original description',
      isActive: true,
    } as OrganizationEntity

    it('should update organization with real validation', async () => {
      // Arrange
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
        description: 'Updated description',
      }

      repository.findActiveById.mockResolvedValue(existingOrg)
      repository.findByName.mockResolvedValue(null) // Nuevo nombre es único
      repository.save.mockImplementation(async (entity) => ({
        ...entity,
        updatedAt: new Date(),
      }))

      // Act
      const result = await service.update('1', updateDto)

      // Assert
      expect(result.name).toBe('Updated Name')
      expect(result.description).toBe('Updated description')
      expect(result.nit).toBe('123456789') // ✅ NIT no cambió
      expect(repository.save).toHaveBeenCalledTimes(1)
    })

    it('should not validate name if it has not changed', async () => {
      // Arrange
      const updateDto: UpdateOrganizationDto = {
        description: 'Updated description', // Solo cambia description
      }

      repository.findActiveById.mockResolvedValue(existingOrg)
      repository.save.mockImplementation(async (entity) => entity)

      // Act
      await service.update('1', updateDto)

      // Assert - NO debe validar nombre si no cambió
      expect(repository.findByName).not.toHaveBeenCalled()
      expect(repository.save).toHaveBeenCalled()
    })
  })
})
```

#### Enfoque B: DB Real en Memoria (Más avanzado)

```typescript
describe('OrganizationsService (E2E-like)', () => {
  let module: TestingModule
  let service: OrganizationsService
  let dataSource: DataSource
  let repository: OrganizationRepository

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [OrganizationEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([OrganizationEntity]),
      ],
      providers: [
        OrganizationsService,
        OrganizationRepository,
        OrganizationValidator,
        OrganizationFactory,
        {
          provide: FilesService,
          useValue: {
            uploadFile: jest.fn(),
            replaceFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile()

    service = module.get(OrganizationsService)
    dataSource = module.get(DataSource)
    repository = module.get(OrganizationRepository)
  })

  afterEach(async () => {
    await dataSource.dropDatabase()
    await dataSource.destroy()
  })

  it('should prevent duplicate names in real database', async () => {
    // Arrange
    await service.create({
      name: 'Org1',
      nit: '123',
      description: 'Test',
      address: 'Test',
      phone: '123',
      email: 'test@test.com',
    })

    // Act & Assert
    await expect(
      service.create({
        name: 'Org1', // ❌ Duplicado
        nit: '456',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test2@test.com',
      }),
    ).rejects.toThrow('Ya existe una organización con el nombre "Org1"')
  })

  it('should allow updating to same name', async () => {
    // Arrange
    const org = await service.create({
      name: 'My Org',
      nit: '123',
      description: 'Test',
      address: 'Test',
      phone: '123',
      email: 'test@test.com',
    })

    // Act - Actualizar con el mismo nombre (debe permitir)
    const updated = await service.update(org.id, {
      name: 'My Org',
      description: 'Updated',
    })

    // Assert
    expect(updated.description).toBe('Updated')
  })
})
```

### Nivel 3: Tests E2E (End-to-End)
**Target:** Flujos completos con HTTP

```typescript
describe('Organizations (E2E)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('POST /organizations - should create organization', () => {
    return request(app.getHttpServer())
      .post('/organizations')
      .send({
        name: 'Test Org',
        nit: '123456789',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Org')
        expect(res.body.isActive).toBe(true)
      })
  })

  it('POST /organizations - should return 409 on duplicate name', async () => {
    // Crear primera org
    await request(app.getHttpServer())
      .post('/organizations')
      .send({
        name: 'Test Org',
        nit: '123',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      })

    // Intentar crear duplicado
    return request(app.getHttpServer())
      .post('/organizations')
      .send({
        name: 'Test Org', // Duplicado
        nit: '456',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test2@test.com',
      })
      .expect(409)
  })
})
```

## 🔄 Plan de Migración Incremental

### Fase 1: Validadores y Factories (Bajo riesgo)
1. Crear tests unitarios para Validators
2. Crear tests unitarios para Factories
3. NO tocar tests de Services todavía

### Fase 2: Refactorizar un Service (Aprendizaje)
1. Elegir UN service (ej: OrganizationsService)
2. Crear nuevo archivo `organizations.service.integration.spec.ts`
3. Implementar tests con instancias reales de Validator/Factory
4. Comparar cobertura y confianza vs tests antiguos
5. Si funciona bien, migrar gradualmente otros services

### Fase 3: Deprecar tests antiguos
1. Una vez que tengas confianza en los nuevos tests
2. Borrar tests antiguos que estaban 100% mockeados
3. Mantener solo los nuevos tests

## 📋 Checklist de Calidad

### ✅ Test Unitario (Validator, Factory)
- [ ] Sin dependencias externas (DB, network, filesystem)
- [ ] Mock solo el repository (si lo necesita)
- [ ] Cubre todos los casos edge
- [ ] Rápido (<10ms por test)

### ✅ Test de Integración (Service)
- [ ] Usa instancias REALES de Validator y Factory
- [ ] Mock solo Repository y servicios I/O (Files, Email)
- [ ] Prueba flujos completos (validación + transformación + guardado)
- [ ] Verifica comportamiento, no implementación interna

### ✅ Test E2E
- [ ] Usa DB real o en memoria
- [ ] Prueba desde HTTP hasta DB
- [ ] Pocos tests, solo happy path + casos críticos

## 🎯 Qué Probar en Cada Nivel

| Componente | Qué Probar | Qué NO Probar |
|------------|------------|---------------|
| **Validator** | ✅ Reglas de validación<br>✅ Mensajes de error<br>✅ Casos edge | ❌ Llamadas al repository (mock) |
| **Factory** | ✅ Transformación de DTO a Entity<br>✅ Valores default<br>✅ Lógica de mapeo | ❌ Sin mocks, todo in-memory |
| **Service** | ✅ Flujo completo<br>✅ Integración Validator+Factory<br>✅ Lógica de negocio | ❌ Detalles internos del Validator/Factory (ya testeados)<br>❌ Queries SQL (mock repository) |
| **E2E** | ✅ Happy paths<br>✅ Casos críticos de negocio<br>✅ Autenticación/Autorización | ❌ Todos los casos edge (ya en unit tests) |

## 💡 Tips y Mejores Prácticas

### 1. Arrange-Act-Assert
```typescript
it('should do something', async () => {
  // Arrange - Preparar datos y mocks
  const dto = { name: 'Test' }
  repository.findByName.mockResolvedValue(null)

  // Act - Ejecutar la acción
  const result = await service.create(dto)

  // Assert - Verificar resultados
  expect(result.name).toBe('Test')
})
```

### 2. Nombres Descriptivos
```typescript
// ❌ MAL
it('should work', () => {})

// ✅ BIEN
it('should throw error when name already exists', () => {})
```

### 3. Un Concepto por Test
```typescript
// ❌ MAL - Testea múltiples cosas
it('should create and update', async () => {
  await service.create(dto)
  await service.update('1', updateDto)
})

// ✅ BIEN - Tests separados
it('should create organization', async () => {})
it('should update organization', async () => {})
```

### 4. Mock Behaviors, Not Implementations
```typescript
// ❌ MAL - Verificar implementación interna
expect(validator.validateUniqueName).toHaveBeenCalled()

// ✅ BIEN - Verificar comportamiento
await expect(service.create(dto)).rejects.toThrow('Ya existe')
```

### 5. Test Edge Cases
```typescript
describe('validateUniqueName', () => {
  it('should throw when name exists')
  it('should pass when name is unique')
  it('should allow same organization to keep its name on update')
  it('should be case insensitive') // Edge case
  it('should trim whitespace') // Edge case
  it('should handle null/undefined') // Edge case
})
```

## 🚀 Ejemplo Completo

Ver archivos de ejemplo:
- `src/modules/organizations/validators/organization.validator.spec.ts`
- `src/modules/organizations/factories/organization.factory.spec.ts`
- `src/modules/organizations/services/organizations.service.integration.spec.ts`

## 📚 Recursos

- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

## ❓ FAQ

### ¿Cuándo usar instancias reales vs mocks?

**Usa instancias REALES:**
- ✅ Validators (lógica de negocio)
- ✅ Factories (transformaciones)
- ✅ Utils/Helpers (funciones puras)

**Usa MOCKS:**
- ✅ Repository (DB)
- ✅ FilesService (filesystem)
- ✅ EmailService (network)
- ✅ HttpService (APIs externas)

### ¿Los tests unitarios con mocks son malos?

No, tienen su lugar. El problema es cuando **TODO** está mockeado. Usa la pirámide:
- 70% Unit tests (rápidos, muchos)
- 20% Integration tests (medio)
- 10% E2E tests (lentos, pocos)

### ¿Debo borrar mis tests actuales?

No inmediatamente. Sigue estos pasos:
1. Crea nuevos tests con la estrategia mejorada
2. Ejecuta ambos en paralelo
3. Cuando tengas confianza, depreca los antiguos
4. Aprende del proceso antes de migrar todo

### ¿Cómo sé si un test es bueno?

Pregúntate:
- Si cambio la implementación pero mantengo el comportamiento, ¿el test sigue pasando?
- Si introduzco un bug, ¿el test lo detecta?
- ¿El test es fácil de entender sin ver la implementación?

Si la respuesta es SÍ, es un buen test.
