# Sistema de Transacciones con CLS

Este documento explica cómo funciona el sistema de transacciones del proyecto y cómo usarlo correctamente.

## Tabla de Contenidos

1. [Conceptos Clave](#conceptos-clave)
2. [¿Cómo Funcionan las Transacciones?](#cómo-funcionan-las-transacciones)
3. [Transacciones Anidadas](#transacciones-anidadas)
4. [Uso del Decorador @Transactional()](#uso-del-decorador-transactional)
5. [Uso Directo de TransactionService](#uso-directo-de-transactionservice)
6. [BaseRepository y CLS](#baserepository-y-cls)
7. [Casos de Uso Comunes](#casos-de-uso-comunes)
8. [Tests](#tests)

---

## Conceptos Clave

### CLS (Continuation Local Storage)

CLS es como una variable "thread-local" en Node.js. Permite almacenar datos que están disponibles en todo el contexto de una operación asíncrona sin tener que pasarlos manualmente.

En este proyecto, usamos CLS para almacenar el `EntityManager` de TypeORM durante una transacción, de modo que todos los repositorios puedan acceder a él automáticamente.

### EntityManager

El `EntityManager` de TypeORM es el objeto que maneja las operaciones de base de datos. Durante una transacción, todas las operaciones deben usar el mismo `EntityManager` para que se ejecuten dentro de la misma transacción.

---

## ¿Cómo Funcionan las Transacciones?

### Flujo básico

```
1. Usuario llama a método con @Transactional()
2. TransactionDiscoveryService intercepta la llamada
3. TransactionService.runInTransaction() inicia transacción
4. EntityManager se guarda en CLS
5. BaseRepository.getRepo() lee el EntityManager de CLS
6. Todos los repositorios usan el mismo EntityManager
7. Si todo funciona: COMMIT
8. Si hay error: ROLLBACK
```

### Diagrama de Flujo

```
@Transactional()                    TransactionService
     ↓                                    ↓
TransactionDiscoveryService    →  runInTransaction()
     ↓                                    ↓
Wrapper intercepta método         Inicia transacción DB
     ↓                                    ↓
Ejecuta método original           Guarda EntityManager en CLS
     ↓                                    ↓
UserRepository.save()      →     getRepo() lee de CLS
     ↓                                    ↓
ProfileRepository.save()   →     getRepo() lee de CLS
     ↓                                    ↓
     ✅ COMMIT                           ✅ COMMIT
```

---

## Transacciones Anidadas

### El Problema

Antes de la mejora, si dos métodos con `@Transactional()` se llamaban entre sí, se creaban **DOS transacciones separadas**:

```typescript
@Injectable()
export class ServiceA {
  @Transactional()  // ❌ Transacción 1
  async methodA() {
    await this.serviceB.methodB()
  }
}

@Injectable()
export class ServiceB {
  @Transactional()  // ❌ Transacción 2 (SEPARADA!)
  async methodB() {
    // ...
  }
}
```

**Problema:** Si `methodB()` falla, solo se revierte su transacción, pero los cambios de `methodA()` ya están comprometidos.

### La Solución

Ahora, el `TransactionService` detecta si ya hay una transacción activa y **la reutiliza**:

```typescript
// En TransactionService.runInTransaction()
async runInTransaction<T>(operation: (entityManager: EntityManager) => Promise<T>): Promise<T> {
  // ✅ Detectar si ya hay una transacción activa
  const existingManager = this.getCurrentEntityManager()

  if (existingManager) {
    // Ya hay una transacción activa, reutilizarla
    return await operation(existingManager)
  }

  // No hay transacción, crear una nueva
  return await this.dataSource.transaction(async (entityManager) => {
    return await this.cls.run(async () => {
      this.cls.set(ENTITY_MANAGER_KEY, entityManager)
      return await operation(entityManager)
    })
  })
}
```

### Ejemplo Correcto

```typescript
@Injectable()
export class ServiceA {
  @Transactional()  // ✅ Transacción 1 (ÚNICA)
  async methodA() {
    await this.serviceB.methodB()  // Usa la misma transacción
  }
}

@Injectable()
export class ServiceB {
  @Transactional()  // ✅ Reutiliza Transacción 1
  async methodB() {
    // Si falla aquí, SE REVIERTE TODO (methodA y methodB)
  }
}
```

---

## Uso del Decorador @Transactional()

El decorador `@Transactional()` es la forma **recomendada** de usar transacciones.

### Ventajas

✅ No necesitas inyectar `TransactionService` en el constructor
✅ Código más limpio y declarativo
✅ Automáticamente maneja transacciones anidadas
✅ Rollback automático en caso de error

### Ejemplo Básico

```typescript
import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserRepository } from './user.repository'
import { ProfileRepository } from './profile.repository'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  @Transactional()
  async createUserWithProfile(userData: CreateUserDto) {
    // Todo dentro de este método se ejecuta en UNA transacción
    const user = await this.userRepository.save(userData)
    const profile = await this.profileRepository.save({ userId: user.id })

    // Si hay error aquí, TODO se revierte (user y profile)
    return { user, profile }
  }
}
```

### Ejemplo con Transacciones Anidadas

```typescript
@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userService: UserService, // Tiene @Transactional()
  ) {}

  @Transactional()  // Transacción 1
  async createOrganizationWithAdmin(data: CreateOrgDto) {
    const org = await this.organizationRepository.save(data)

    // ✅ createUserWithProfile() reutiliza la misma transacción
    const admin = await this.userService.createUserWithProfile({
      ...data.adminData,
      organizationId: org.id,
    })

    return { org, admin }
  }
}
```

### Cuándo NO usar @Transactional()

❌ **En consultas simples de solo lectura**

```typescript
// ❌ NO necesitas transacción aquí
@Transactional()
async findUserById(id: string) {
  return await this.userRepository.findById(id)
}

// ✅ Mejor sin transacción
async findUserById(id: string) {
  return await this.userRepository.findById(id)
}
```

❌ **En métodos que solo llaman a otros métodos**

```typescript
// ❌ NO necesitas transacción aquí si validateUser ya tiene una
@Transactional()
async processUser(id: string) {
  await this.validateUser(id)  // Ya tiene @Transactional()
}
```

---

## Uso Directo de TransactionService

Si prefieres control manual sobre las transacciones, puedes usar `TransactionService` directamente.

### Cuándo Usarlo

- Necesitas acceso directo al `EntityManager`
- Quieres control más fino sobre la transacción
- Necesitas ejecutar queries raw SQL

### Ejemplo

```typescript
import { Injectable } from '@nestjs/common'
import { TransactionService } from '@core/database'
import { UserRepository } from './user.repository'

@Injectable()
export class UserService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly userRepository: UserRepository,
  ) {}

  async createUser(userData: CreateUserDto) {
    return await this.transactionService.runInTransaction(async (em) => {
      // Aquí puedes usar 'em' directamente si lo necesitas
      const user = await this.userRepository.save(userData)

      // Ejecutar query raw
      await em.query('UPDATE settings SET updated_at = NOW()')

      return user
    })
  }
}
```

### Métodos Disponibles

#### `runInTransaction<T>(operation: (em: EntityManager) => Promise<T>): Promise<T>`

**Uso principal:** Ejecuta una operación dentro de una transacción.

**Características:**
- ✅ Crea una nueva transacción con `dataSource.transaction()`
- ✅ Hace COMMIT automático si todo sale bien
- ✅ Hace ROLLBACK automático si hay error
- ✅ Reutiliza transacciones anidadas automáticamente
- ✅ Pasa el EntityManager como parámetro

```typescript
await this.transactionService.runInTransaction(async (em) => {
  // Tu código aquí
  await this.userRepository.save(user)
  await this.profileRepository.save(profile)
  // ✅ Commit automático
})
```

#### `getCurrentEntityManager(): EntityManager | undefined`

Obtiene el EntityManager actual del contexto CLS.

```typescript
const em = this.transactionService.getCurrentEntityManager()
if (em) {
  // Hay una transacción activa
}
```

#### `isTransactionActive(): boolean`

Verifica si hay una transacción activa.

```typescript
if (this.transactionService.isTransactionActive()) {
  console.log('Estamos dentro de una transacción')
}
```

#### `runWithEntityManager<T>(em: EntityManager, operation: () => Promise<T>): Promise<T>`

**⚠️ MÉTODO AVANZADO - Úsalo solo en casos muy específicos**

**Uso:** Ejecuta una operación usando un EntityManager existente que ya tienes.

**Características:**
- ❌ NO crea una transacción
- ❌ NO hace COMMIT/ROLLBACK automático
- ✅ Solo establece el EntityManager en CLS para que los repositorios lo usen
- ❌ NO pasa el EntityManager como parámetro

**Casos de uso válidos:**
1. **Código legacy:** Integración con código existente que ya maneja transacciones
2. **Testing:** Cuando necesitas mockear el EntityManager
3. **Scripts/Migraciones:** Scripts que manejan transacciones manualmente

```typescript
// ❌ NO USES ASÍ en código de aplicación normal
const externalEM = connection.manager
await this.transactionService.runWithEntityManager(externalEM, async () => {
  await this.userRepository.save(user)
  // ⚠️ NO hace commit - debes manejarlo tú manualmente
})

// ✅ MEJOR: Usa runInTransaction() para código de aplicación
await this.transactionService.runInTransaction(async (em) => {
  await this.userRepository.save(user)
  // ✅ Commit automático
})
```

---

## BaseRepository y TransactionService

Todos los repositorios deben extender `BaseRepository` para beneficiarse del sistema de transacciones.

### Cómo Funciona

**IMPORTANTE:** BaseRepository usa `TransactionService` para mantener consistencia en el manejo de transacciones.

```typescript
// BaseRepository internamente hace esto:
protected getRepo(): Repository<T> {
  // ✅ Usa TransactionService (no CLS directamente)
  const contextEntityManager = this.transactionService.getCurrentEntityManager()

  if (contextEntityManager && typeof contextEntityManager.getRepository === 'function') {
    // ✅ Hay una transacción activa, usar su EntityManager
    return contextEntityManager.getRepository(this.repository.target)
  }

  // No hay transacción, usar el repository por defecto
  return this.repository
}
```

**¿Por qué usar TransactionService en lugar de CLS directamente?**

✅ **Single Responsibility:** TransactionService es el responsable de manejar el EntityManager
✅ **Mantenibilidad:** Si cambia la lógica, solo se modifica en un lugar
✅ **Testabilidad:** Más fácil de mockear en tests
✅ **Consistencia:** Todo el sistema usa el mismo método para obtener el EntityManager

### Implementar un Repository

```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TransactionService } from '@core/database'
import { BaseRepository } from '@core/repositories'
import { User } from './user.entity'

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User) repository: Repository<User>,
    transactionService: TransactionService, // ✅ IMPORTANTE: Inyectar TransactionService (no ClsService)
  ) {
    super(repository, transactionService)
  }

  // Métodos personalizados
  async findByEmail(email: string) {
    // ✅ getRepo() automáticamente usa el EntityManager correcto
    return await this.getRepo().findOne({ where: { email } })
  }
}
```

**⚠️ NOTA:** Si tienes repositorios antiguos que inyectan `ClsService`, cámbialos a `TransactionService`.

---

## Casos de Uso Comunes

### Caso 1: Crear Múltiples Entidades Relacionadas

```typescript
@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly evaluationRepository: EvaluationRepository,
    private readonly actionPlanRepository: ActionPlanRepository,
  ) {}

  @Transactional()
  async createCompleteAudit(data: CreateAuditDto) {
    // Todas estas operaciones se ejecutan en UNA transacción
    const audit = await this.auditRepository.save(data)

    const evaluations = await this.evaluationRepository.saveMany(
      data.evaluations.map(e => ({ ...e, auditId: audit.id }))
    )

    const actionPlans = await this.actionPlanRepository.saveMany(
      data.actionPlans.map(a => ({ ...a, auditId: audit.id }))
    )

    return { audit, evaluations, actionPlans }
  }
}
```

### Caso 2: Actualización en Cadena con Validaciones

```typescript
@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  @Transactional()
  async deactivateOrganization(orgId: string) {
    const org = await this.organizationRepository.findById(orgId)
    if (!org) throw new NotFoundException('Organización no encontrada')

    // Desactivar todos los usuarios
    const users = await this.userRepository.findWhere({ organizationId: orgId })
    await Promise.all(users.map(u => this.userRepository.softDelete(u.id)))

    // Desactivar organización
    await this.organizationRepository.softDelete(orgId)

    // Si algo falla, TODO se revierte
  }
}
```

### Caso 3: Servicios Anidados

```typescript
@Injectable()
export class NotificationService {
  @Transactional()
  async sendNotification(userId: string, message: string) {
    await this.notificationRepository.save({ userId, message })
    await this.logRepository.save({ action: 'notification_sent', userId })
  }
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Transactional()
  async registerUser(data: CreateUserDto) {
    const user = await this.userRepository.save(data)

    // ✅ sendNotification() reutiliza la misma transacción
    await this.notificationService.sendNotification(
      user.id,
      'Bienvenido al sistema'
    )

    // Si sendNotification() falla, TODO se revierte (incluido el user)
    return user
  }
}
```

---

## Tests

Todos los tests están en `/src/@core/database/transaction.service.spec.ts`.

### Cobertura de Tests

✅ `getCurrentEntityManager()` - Verifica obtención del EntityManager de CLS
✅ `isTransactionActive()` - Verifica detección de transacciones activas
✅ `runInTransaction()` - Crea nueva transacción cuando no hay una activa
✅ `runInTransaction()` - Reutiliza transacción existente (nested transactions)
✅ Propagación de errores
✅ Manejo de transacciones anidadas
✅ Contexto CLS se mantiene a través de múltiples operaciones
✅ Rollback cuando hay error en transacción anidada
✅ Múltiples niveles de anidación

### Ejecutar Tests

```bash
# Tests del TransactionService
npm test -- transaction.service.spec.ts

# Tests del TransactionDiscoveryService
npm test -- transaction-discovery.service.spec.ts
```

---

## Resumen

### ✅ Ventajas del Sistema

1. **Automático**: No necesitas pasar EntityManager manualmente
2. **Declarativo**: Usa `@Transactional()` y listo
3. **Seguro**: Maneja transacciones anidadas correctamente
4. **Rollback automático**: Si hay error, todo se revierte
5. **Clean code**: Código más limpio y fácil de mantener

### 📝 Mejores Prácticas

1. Usa `@Transactional()` para operaciones que modifican datos
2. NO uses `@Transactional()` para consultas simples de solo lectura
3. Confía en las transacciones anidadas - el sistema las maneja correctamente
4. Todos los repositorios deben extender `BaseRepository`
5. Siempre inyecta `ClsService` en tus repositorios

### 🚨 Errores Comunes

❌ Olvidar extender `BaseRepository`
❌ No inyectar `ClsService` en el constructor del repository
❌ Usar `@Transactional()` en métodos que solo leen datos
❌ Intentar manejar transacciones manualmente cuando ya tienes `@Transactional()`

---

## Referencias

- [NestJS CLS Documentation](https://github.com/Papooch/nestjs-cls)
- [TypeORM Transactions](https://typeorm.io/transactions)
- [Continuation Local Storage](https://github.com/othiym23/node-continuation-local-storage)
