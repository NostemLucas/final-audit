# Sistema de Auditoría Automática

Este documento explica el sistema de auditoría automática implementado en el proyecto, que utiliza **CLS (Continuation Local Storage)** para capturar el usuario autenticado y aplicar automáticamente los campos `createdBy` y `updatedBy` en todas las entidades.

## Tabla de Contenidos

- [Introducción](#introducción)
- [Arquitectura](#arquitectura)
- [Componentes](#componentes)
- [Flujo de Ejecución](#flujo-de-ejecución)
- [Uso](#uso)
- [Casos Especiales](#casos-especiales)
- [Testing](#testing)

---

## Introducción

### Problema Resuelto

Antes del sistema de auditoría, era necesario pasar manualmente el `userId` como parámetro en cada operación de creación/actualización:

```typescript
// ❌ Antes: Pasar userId manualmente
await this.userRepository.save({ ...data, createdBy: userId })
await this.userRepository.update(id, { ...data, updatedBy: userId })
```

### Solución

Con el sistema de auditoría automática, el `userId` se captura automáticamente de la petición HTTP y se aplica en segundo plano:

```typescript
// ✅ Ahora: Auditoría automática
await this.userRepository.save(data) // createdBy se aplica automáticamente
await this.userRepository.update(id, data) // updatedBy se aplica automáticamente
```

---

## Arquitectura

El sistema se compone de tres capas:

```
HTTP Request
    ↓
[JwtAuthGuard] → Valida token y añade user a request
    ↓
[AuditInterceptor] → Captura user.sub y lo guarda en CLS
    ↓
[Controller/UseCase] → Lógica de negocio
    ↓
[BaseRepository] → Lee userId de CLS y aplica createdBy/updatedBy
    ↓
Database
```

### Tecnologías Usadas

- **CLS (Continuation Local Storage)**: Almacenamiento por contexto de request
- **nestjs-cls**: Biblioteca de NestJS para CLS
- **Interceptors**: Para capturar el usuario
- **TypeORM**: Para aplicar auditoría en save/update

---

## Componentes

### 1. AuditService

**Ubicación**: `src/@core/database/audit.service.ts`

Servicio centralizado para manejar auditoría usando CLS.

#### Métodos Principales

```typescript
// Establecer usuario actual
auditService.setCurrentUserId(userId: string): void

// Obtener usuario actual
auditService.getCurrentUserId(): string | undefined

// Verificar si hay usuario
auditService.hasCurrentUser(): boolean

// Ejecutar como usuario específico (útil para seeds)
await auditService.runAsUser('system', async () => {
  await this.seedData()
})

// Ejecutar sin usuario (útil para migraciones)
await auditService.runWithoutUser(async () => {
  await this.migrationData()
})

// Aplicar auditoría manualmente
auditService.applyAudit(entity, isNew)
```

---

### 2. AuditInterceptor

**Ubicación**: `src/@core/interceptors/audit.interceptor.ts`

Interceptor global que captura el usuario autenticado de cada petición HTTP.

#### Funcionamiento

1. Se ejecuta después de `JwtAuthGuard`
2. Lee `request.user.sub` (añadido por el guard)
3. Lo almacena en CLS usando `AuditService`
4. El usuario queda disponible para toda la petición

#### Registro

```typescript
// En AppModule
{
  provide: APP_INTERCEPTOR,
  useClass: AuditInterceptor,
}
```

---

### 3. BaseRepository (Modificado)

**Ubicación**: `src/@core/repositories/base.repository.ts`

El `BaseRepository` ahora recibe `AuditService` en el constructor y aplica auditoría automáticamente.

#### Constructor

```typescript
protected constructor(
  protected readonly repository: Repository<T>,
  protected readonly transactionService: TransactionService,
  protected readonly auditService: AuditService, // ← Nuevo parámetro
) {}
```

#### Métodos con Auditoría

- **`save()`**: Aplica `createdBy` si es nueva entidad
- **`saveMany()`**: Aplica auditoría a cada entidad
- **`update()`**: Aplica `updatedBy`
- **`patch()`**: Aplica `updatedBy`

---

## Flujo de Ejecución

### Caso 1: Crear Usuario (POST /users)

```
1. Cliente → POST /users con JWT en header
2. JwtAuthGuard → Valida token, añade user a request
3. AuditInterceptor → Lee request.user.sub = "user-123"
4. AuditInterceptor → guarda "user-123" en CLS
5. Controller → createUser(dto)
6. UseCase → userRepository.save(dto)
7. BaseRepository.save() → Lee "user-123" de CLS
8. BaseRepository.save() → Aplica createdBy = "user-123"
9. Database → INSERT con createdBy = "user-123"
```

### Caso 2: Actualizar Usuario (PATCH /users/:id)

```
1. Cliente → PATCH /users/456 con JWT
2. JwtAuthGuard → Valida token, añade user a request
3. AuditInterceptor → guarda "user-123" en CLS
4. Controller → updateUser(id, dto)
5. UseCase → userRepository.update(id, dto)
6. BaseRepository.update() → Lee "user-123" de CLS
7. BaseRepository.update() → Aplica updatedBy = "user-123"
8. Database → UPDATE con updatedBy = "user-123"
```

---

## Uso

### Uso Automático (Recomendado)

No necesitas hacer nada especial. La auditoría se aplica automáticamente:

```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto) {
    // ✅ createdBy se aplica automáticamente desde CLS
    const user = await this.userRepository.save(dto)
    return user
  }
}
```

### Repositorios Personalizados

Al crear un repositorio personalizado, debes inyectar `AuditService`:

```typescript
@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity) repository: Repository<UserEntity>,
    transactionService: TransactionService,
    auditService: AuditService, // ← Inyectar AuditService
  ) {
    super(repository, transactionService, auditService)
  }

  // Métodos personalizados...
}
```

---

## Casos Especiales

### 1. Seeds y Migraciones

Para seeds y migraciones, donde no hay un usuario autenticado:

```typescript
@Injectable()
export class DatabaseSeeder {
  constructor(private readonly auditService: AuditService) {}

  async seed() {
    // Opción A: Ejecutar como usuario "system"
    await this.auditService.runAsUser('system', async () => {
      await this.userRepository.save(defaultUsers)
      // createdBy = "system"
    })

    // Opción B: Ejecutar sin usuario (createdBy = null)
    await this.auditService.runWithoutUser(async () => {
      await this.migrationRepository.save(migrationData)
      // createdBy = null
    })
  }
}
```

### 2. Operaciones de Sistema

Para operaciones ejecutadas por el sistema (cron jobs, background tasks):

```typescript
@Injectable()
export class BackgroundJobService {
  constructor(private readonly auditService: AuditService) {}

  @Cron('0 0 * * *')
  async dailyJob() {
    await this.auditService.runAsUser('system', async () => {
      // Todas las operaciones tendrán createdBy/updatedBy = "system"
      await this.generateReports()
      await this.cleanupOldData()
    })
  }
}
```

### 3. Testing

En tests, puedes establecer el usuario manualmente:

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase
  let auditService: AuditService

  beforeEach(async () => {
    // Setup...
  })

  it('should create user with createdBy', async () => {
    // Establecer usuario para el test
    auditService.setCurrentUserId('test-user-id')

    const result = await useCase.execute(createUserDto)

    expect(result.createdBy).toBe('test-user-id')
  })
})
```

### 4. Deshabilitar Auditoría Temporalmente

En casos muy específicos donde NO quieres auditoría:

```typescript
await this.auditService.runWithoutUser(async () => {
  await this.repository.save(data)
  // createdBy y updatedBy serán null
})
```

---

## Testing

### Unit Tests

```typescript
describe('AuditService', () => {
  let service: AuditService
  let cls: ClsService

  beforeEach(() => {
    cls = new ClsService()
    service = new AuditService(cls)
  })

  it('should set and get current user', () => {
    service.setCurrentUserId('user-123')
    expect(service.getCurrentUserId()).toBe('user-123')
  })

  it('should return undefined when no user', () => {
    expect(service.getCurrentUserId()).toBeUndefined()
  })

  it('should run as specific user', async () => {
    await service.runAsUser('admin', async () => {
      expect(service.getCurrentUserId()).toBe('admin')
    })
  })
})
```

### Integration Tests

```typescript
describe('UserRepository with Audit', () => {
  let repository: UserRepository
  let auditService: AuditService

  it('should apply createdBy on save', async () => {
    auditService.setCurrentUserId('test-user')

    const user = await repository.save({
      email: 'test@example.com',
      username: 'testuser',
    })

    expect(user.createdBy).toBe('test-user')
  })

  it('should apply updatedBy on update', async () => {
    auditService.setCurrentUserId('updater-user')

    await repository.update(userId, { email: 'new@example.com' })

    const updated = await repository.findById(userId)
    expect(updated.updatedBy).toBe('updater-user')
  })
})
```

---

## Ventajas del Sistema

### 1. **Cero Configuración**
- Se aplica automáticamente en todos los repositorios
- No necesitas recordar pasar `userId` manualmente

### 2. **Consistencia**
- Todos los registros tienen auditoría uniforme
- Reduce errores humanos (olvidar pasar userId)

### 3. **Flexibilidad**
- Soporta casos especiales (seeds, migraciones, sistema)
- Puede deshabilitarse cuando sea necesario

### 4. **Transparencia**
- No cambia la firma de los métodos
- Código más limpio y legible

### 5. **Integración con Transacciones**
- Funciona perfectamente con `@Transactional()`
- Usa el mismo sistema CLS

---

## Mejores Prácticas

### 1. Usar Auditoría Automática

```typescript
// ✅ CORRECTO: Dejar que la auditoría se aplique automáticamente
await this.userRepository.save(userData)

// ❌ INCORRECTO: No sobreescribir createdBy manualmente
await this.userRepository.save({
  ...userData,
  createdBy: 'manual-user-id', // Esto sobreescribe la auditoría automática
})
```

### 2. Seeds y Migraciones

```typescript
// ✅ CORRECTO: Usar runAsUser para seeds
await this.auditService.runAsUser('system', async () => {
  await this.seedDatabase()
})

// ⚠️ ACEPTABLE: Dejar createdBy como null para migraciones legacy
await this.auditService.runWithoutUser(async () => {
  await this.importLegacyData()
})
```

### 3. Background Jobs

```typescript
// ✅ CORRECTO: Identificar operaciones del sistema
@Cron('0 0 * * *')
async cleanupJob() {
  await this.auditService.runAsUser('system:cleanup', async () => {
    await this.cleanup()
  })
}
```

---

## Troubleshooting

### Problema: createdBy es null

**Causa**: No hay usuario en el contexto CLS.

**Solución**:
- Verifica que el AuditInterceptor esté registrado globalmente
- Verifica que la petición tenga JWT válido
- Para seeds/migraciones, usa `runAsUser('system')`

### Problema: createdBy se sobrescribe

**Causa**: Estás pasando `createdBy` manualmente en el DTO.

**Solución**: No pases `createdBy` en el DTO, déjalo que se aplique automáticamente.

### Problema: Tests fallan

**Causa**: En tests, el usuario no se establece automáticamente.

**Solución**:
```typescript
beforeEach(() => {
  auditService.setCurrentUserId('test-user-id')
})
```

---

## Referencias

- [NestJS CLS](https://github.com/Papooch/nestjs-cls)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [TypeORM Entity Listeners](https://typeorm.io/listeners-and-subscribers)
- [Continuation Local Storage](https://github.com/othiym23/node-continuation-local-storage)

---

## Changelog

### v1.0.0 (2025-01-12)
- ✨ Implementación inicial del sistema de auditoría automática
- ✨ AuditService para centralizar lógica de auditoría
- ✨ AuditInterceptor para capturar usuario de peticiones HTTP
- ✨ Integración con BaseRepository
- ✨ Soporte para seeds, migraciones y operaciones del sistema
