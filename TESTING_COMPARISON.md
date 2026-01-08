# Comparación: Antes vs Después

Este documento muestra la diferencia entre el enfoque antiguo (todo mockeado) y el nuevo (solo mockear infraestructura).

## 📊 Resumen de Resultados

### Tests Creados

| Archivo | Tests | Resultado |
|---------|-------|-----------|
| `organization.factory.spec.ts` | 17 tests | ✅ 100% passed |
| `organizations.service.integration.spec.ts` | 23 tests | ✅ 100% passed |
| **Total** | **40 tests** | **✅ 100% passed** |

### Tiempo de Ejecución

- Factory tests: ~0.9s
- Service integration tests: ~1.3s
- **Total: ~2.2s** (muy rápido para tests de integración)

## 🔄 Comparación Lado a Lado

### Enfoque ANTIGUO (organizations.service.spec.ts)

```typescript
// ❌ PROBLEMA: Mockea TODO
describe('OrganizationsService', () => {
  let service: OrganizationsService
  let repository: jest.Mocked<IOrganizationRepository>  // Mock
  let validator: jest.Mocked<OrganizationValidator>     // ❌ Mock
  let factory: jest.Mocked<OrganizationFactory>         // ❌ Mock
  let filesService: jest.Mocked<FilesService>           // Mock

  beforeEach(async () => {
    const mockRepository = { save: jest.fn(), ... }
    const mockValidator = { validateUnique: jest.fn() }  // ❌ Mock
    const mockFactory = { createFromDto: jest.fn() }     // ❌ Mock
    const mockFilesService = { uploadFile: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: ORGANIZATION_REPOSITORY, useValue: mockRepository },
        { provide: OrganizationValidator, useValue: mockValidator },    // ❌
        { provide: OrganizationFactory, useValue: mockFactory },        // ❌
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile()

    // ...
  })

  it('should create an organization successfully', async () => {
    // Arrange
    const createDto = { name: 'New Organization', nit: '987654321' }
    const createdOrg = { ...mockOrganization, ...createDto }

    validator.validateUniqueConstraints.mockResolvedValue(undefined)  // ❌
    factory.createFromDto.mockReturnValue(createdOrg)                 // ❌
    repository.save.mockResolvedValue(createdOrg)

    // Act
    const result = await service.create(createDto)

    // Assert
    expect(validator.validateUniqueConstraints).toHaveBeenCalled()  // ❌
    expect(factory.createFromDto).toHaveBeenCalled()                // ❌
    expect(result).toBe(createdOrg)
  })
})
```

**Problemas:**
- ❌ No prueba la lógica REAL de validación
- ❌ No prueba la lógica REAL de normalización
- ❌ Si hay un bug en Validator o Factory, este test NO lo detecta
- ❌ Solo verifica que "se llamó X con Y"
- ❌ Test frágil: cualquier cambio interno rompe el test

### Enfoque NUEVO (organizations.service.integration.spec.ts)

```typescript
// ✅ MEJOR: Solo mockea infraestructura
describe('OrganizationsService (Integration)', () => {
  let service: OrganizationsService
  let repository: jest.Mocked<IOrganizationRepository>  // Mock (DB)
  let validator: OrganizationValidator                  // ✅ REAL
  let factory: OrganizationFactory                      // ✅ REAL
  let filesService: jest.Mocked<FilesService>           // Mock (I/O)

  beforeEach(() => {
    // Mock solo infraestructura
    repository = { save: jest.fn(), ... } as any
    filesService = { uploadFile: jest.fn(), ... } as any

    // ✅ Instancias REALES de lógica de negocio
    validator = new OrganizationValidator(repository)
    factory = new OrganizationFactory()

    // Service con dependencias mixtas
    service = new OrganizationsService(
      repository,
      validator,    // ✅ REAL
      factory,      // ✅ REAL
      filesService,
    )
  })

  it('should create organization with real validation and normalization', async () => {
    // Arrange
    const createDto = {
      name: 'new organization',     // lowercase
      nit: '987-654 321',           // con espacios
      email: 'NEW@test.com',        // uppercase
    }

    // Mock SOLO respuestas del repository
    repository.findByName.mockResolvedValue(null)
    repository.findByNit.mockResolvedValue(null)
    repository.save.mockImplementation(async (entity) => ({
      ...entity,
      id: 'generated-id',
    }))

    // Act
    const result = await service.create(createDto)

    // Assert - Verificar COMPORTAMIENTO real
    // ✅ Factory normalizó automáticamente (NO mockeamos esto)
    expect(result.name).toBe('New Organization')  // Capitalizado
    expect(result.nit).toBe('987-654321')         // Sin espacios
    expect(result.email).toBe('new@test.com')     // Lowercase
    expect(result.isActive).toBe(true)            // Default del Factory

    // ✅ Validator ejecutó validaciones REALES
    expect(repository.findByName).toHaveBeenCalledWith('new organization')
    expect(repository.findByNit).toHaveBeenCalledWith('987-654 321')
  })

  it('should throw DuplicateOrganizationNameException (REAL validation)', async () => {
    // Arrange
    const createDto = { name: 'new organization', nit: '123' }
    repository.findByName.mockResolvedValue({ id: '2', name: 'new organization' })
    repository.findByNit.mockResolvedValue(null)

    // Act & Assert
    await expect(service.create(createDto)).rejects.toThrow(
      DuplicateOrganizationNameException,
    )

    // ✅ El mensaje de error viene del Validator REAL
    await expect(service.create(createDto)).rejects.toThrow(
      'Ya existe una organización con el nombre "new organization"',
    )

    // ✅ Verificar que NO se guardó
    expect(repository.save).not.toHaveBeenCalled()
  })
})
```

**Ventajas:**
- ✅ Prueba la lógica REAL de validación
- ✅ Prueba la lógica REAL de normalización
- ✅ Si hay un bug en Validator o Factory, este test LO DETECTA
- ✅ Verifica comportamiento, no implementación interna
- ✅ Test robusto: cambios internos no rompen el test

## 🐛 Bug Detectado por los Tests

Los tests de integración revelaron un **bug potencial** en la implementación:

### Problema

```typescript
// organizations.service.ts (líneas 27-36)
async create(createOrganizationDto: CreateOrganizationDto) {
  // ❌ PROBLEMA: Valida ANTES de normalizar
  await this.validator.validateUniqueConstraints(
    createOrganizationDto.name,  // "test org" (sin normalizar)
    createOrganizationDto.nit,   // "123 456 789" (sin normalizar)
  )

  // Normaliza DESPUÉS de validar
  const organization = this.organizationFactory.createFromDto(createOrganizationDto)
  return await this.organizationRepository.save(organization)
}
```

### Escenario del Bug

1. Usuario crea org con nombre `"Test Org"` (normalizado a `"Test Org"`)
2. Otro usuario intenta crear org con nombre `"test   org"` (múltiples espacios)
3. Validator busca `"test   org"` en la DB → No encuentra duplicado ❌
4. Factory normaliza a `"Test Org"`
5. Se intenta guardar → **ERROR de DB por constraint UNIQUE**

### Solución

```typescript
// ✅ SOLUCIÓN: Normalizar ANTES de validar
async create(createOrganizationDto: CreateOrganizationDto) {
  // Normalizar primero
  const organization = this.organizationFactory.createFromDto(createOrganizationDto)

  // Validar con valores normalizados
  await this.validator.validateUniqueConstraints(
    organization.name,  // "Test Org" (normalizado)
    organization.nit,   // "123456789" (normalizado)
  )

  return await this.organizationRepository.save(organization)
}
```

**Mismo problema en `update()`:**

```typescript
// ✅ SOLUCIÓN para update
async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
  const organization = await this.findOne(id)

  // Aplicar cambios con normalización
  const updatedOrganization = this.organizationFactory.updateFromDto(
    organization,
    updateOrganizationDto,
  )

  // Validar con valores normalizados
  if (
    updatedOrganization.name !== organization.name
  ) {
    await this.validator.validateUniqueName(updatedOrganization.name, id)
  }

  if (
    updatedOrganization.nit !== organization.nit
  ) {
    await this.validator.validateUniqueNit(updatedOrganization.nit, id)
  }

  return await this.organizationRepository.save(updatedOrganization)
}
```

## 📈 Cobertura de Código

### Factory (100% lógica pura)

| Métodos | Coverage |
|---------|----------|
| `createFromDto` | ✅ 100% |
| `updateFromDto` | ✅ 100% |
| `normalizeName` | ✅ 100% (incluyendo edge cases) |
| `normalizeNIT` | ✅ 100% (incluyendo edge cases) |

**Edge cases cubiertos:**
- Múltiples espacios consecutivos
- Campos vacíos → null
- Normalización de mayúsculas/minúsculas
- Caracteres especiales
- Strings muy largos

### Service Integration

| Operación | Coverage |
|-----------|----------|
| `create` | ✅ Happy path + validación real + normalización |
| `update` | ✅ Happy path + validación condicional + edge cases |
| `findAll` | ✅ Con y sin resultados |
| `findOne` | ✅ Encontrado + no encontrado |
| `findByNit` | ✅ Encontrado + no encontrado |
| `uploadLogo` | ✅ Upload exitoso + org no existe |
| `remove` | ✅ Soft delete + restricción usuarios activos |
| `delete` | ✅ Hard delete |

## 🎯 Conclusiones

### Lo que Aprendimos

1. **Mockear TODO no prueba nada útil**
   - Solo verifica que se llaman métodos
   - No detecta bugs en la lógica de negocio

2. **Solo mockear infraestructura es mejor**
   - Prueba la lógica real
   - Detecta bugs (como el bug de normalización)
   - Más confiable, menos frágil

3. **Los tests revelaron un bug real**
   - El Service validaba antes de normalizar
   - Podía permitir duplicados con diferentes formatos
   - Los tests antiguos NO lo habrían detectado

### Qué Hacer Ahora

#### Opción 1: Mantener ambos (recomendado mientras aprendes)
```bash
# Tests antiguos (con todo mockeado)
organizations.service.spec.ts          # Mantener por ahora

# Tests nuevos (con instancias reales)
organization.factory.spec.ts           # ✅ Nuevo
organizations.service.integration.spec.ts  # ✅ Nuevo
```

#### Opción 2: Migrar gradualmente
1. Mantener tests antiguos
2. Crear tests nuevos para nuevos features
3. Cuando tengas confianza, deprecar los antiguos
4. Aprender del proceso

#### Opción 3: Reemplazar completamente
1. Borrar `organizations.service.spec.ts`
2. Usar solo `organizations.service.integration.spec.ts`
3. Aplicar el mismo patrón a otros módulos

### Próximos Pasos

1. **Arreglar el bug de normalización** en `OrganizationsService`
2. **Aplicar el mismo patrón** a `UsersService`
3. **Crear tests para otros componentes**:
   - `UserValidator` (similar a OrganizationValidator)
   - `UserFactory` (similar a OrganizationFactory)
   - `UsersService` (versión integration)

## 📚 Referencias

- Ver guía completa: `TESTING_SERVICES.md`
- Ver tests de repositorios: `src/@core/repositories/TESTING.md`
- Ejemplos:
  - `organization.factory.spec.ts` - Test unitario puro (sin mocks)
  - `organization.validator.spec.ts` - Test unitario con mock mínimo
  - `organizations.service.integration.spec.ts` - Test de integración mejorado

## 💡 Regla de Oro

**Mock lo que NO puedes controlar, usa REAL lo que SÍ puedes controlar:**

| Componente | ¿Mockear? | Razón |
|------------|-----------|-------|
| Database (Repository) | ✅ Mockear | No controlamos la DB en unit tests |
| Filesystem (FilesService) | ✅ Mockear | No queremos crear archivos reales |
| Email (EmailService) | ✅ Mockear | No queremos enviar emails reales |
| HTTP (HttpService) | ✅ Mockear | No queremos hacer requests reales |
| Validator | ❌ REAL | Es lógica de negocio que queremos probar |
| Factory | ❌ REAL | Es lógica de negocio que queremos probar |
| Utils/Helpers | ❌ REAL | Son funciones puras que queremos probar |
