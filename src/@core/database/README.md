## Sistema de Transacciones con CLS

Sistema de transacciones automático usando **CLS (Continuation Local Storage)** que permite manejar transacciones de base de datos sin tener que pasar el `EntityManager` manualmente.

## ¿Qué es CLS?

**CLS (Continuation Local Storage)** es como `AsyncLocalStorage` pero mejor integrado con NestJS. Permite almacenar datos en el contexto de una request y acceder a ellos desde cualquier parte del código sin pasarlos como parámetros.

## Arquitectura

```
Request HTTP
    ↓
CLS Middleware (inicia contexto)
    ↓
Controller
    ↓
Service (@Transactional)
    ↓
TransactionService (guarda EntityManager en CLS)
    ↓
Repository (obtiene EntityManager de CLS automáticamente)
    ↓
TypeORM (usa el EntityManager correcto)
```

## Instalación

El módulo ya está configurado en `AppModule`:

```typescript
import { DatabaseModule } from '@core/database'

@Module({
  imports: [
    DatabaseModule, // Configura CLS y TransactionService automáticamente
    // ... otros módulos
  ],
})
export class AppModule {}
```

## Uso Básico

### 1. Decorador `@Transactional()`

La forma más fácil de usar transacciones:

```typescript
import { Injectable } from '@nestjs/common'
import { Transactional } from '@core/database'
import { UserRepository } from './user.repository'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly transactionService: TransactionService, // Requerido para @Transactional
  ) {}

  @Transactional()
  async createUser(data: CreateUserDto) {
    // Todo dentro de este método se ejecuta en una transacción
    // Los repositorios obtienen automáticamente el EntityManager de CLS
    const user = await this.userRepository.save(data)
    const profile = await this.profileRepository.save({ userId: user.id })

    // Si hay error, se hace rollback automático
    if (!profile) {
      throw new Error('Error creando perfil') // ← Rollback automático
    }

    return { user, profile }
  }
}
```

### 2. `TransactionService.runInTransaction()`

Uso directo del servicio:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async createUserWithProfile(data: CreateUserDto) {
    return await this.transactionService.runInTransaction(async (entityManager) => {
      // Dentro de esta función, todos los repositorios usan
      // automáticamente el EntityManager de la transacción
      const user = await this.userRepository.save(data)
      const profile = await this.profileRepository.save({ userId: user.id })

      return { user, profile }
    })
  }
}
```

### 3. Sin Transacción

Para operaciones simples que no necesitan transacción:

```typescript
async findUserByEmail(email: string) {
  // No hay transacción, usa el repositorio normal
  return await this.userRepository.findByEmail(email)
}
```

## Implementar un Repository

### BaseRepository ya está configurado

Todos los repositorios que extienden `BaseRepository` obtienen CLS automáticamente:

```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseRepository } from '@core/repositories'
import { User } from './user.entity'
import { ClsService } from 'nestjs-cls'

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    cls: ClsService, // ← Inyectar CLS
  ) {
    super(repository, cls) // ← Pasar al BaseRepository
  }

  // Métodos personalizados
  async findByEmail(email: string) {
    // getRepo() obtiene automáticamente el EntityManager de CLS
    return await this.getRepo().findOne({ where: { email } })
  }
}
```

### Cómo funciona `getRepo()`

```typescript
protected getRepo(entityManager?: EntityManager): Repository<T> {
  // Prioridad:
  // 1. EntityManager pasado explícitamente
  // 2. EntityManager de CLS (si hay transacción activa)
  // 3. Repositorio por defecto
  const contextEntityManager =
    entityManager ?? this.cls.get<EntityManager>(ENTITY_MANAGER_KEY)

  return (
    contextEntityManager?.getRepository(this.repository.target) ??
    this.repository
  )
}
```

## Ejemplos Completos

### Ejemplo 1: Crear Usuario con Perfil

```typescript
@Transactional()
async createUserWithProfile(data: CreateUserDto) {
  // Paso 1: Crear usuario
  const user = await this.userRepository.save({
    email: data.email,
    name: data.name,
  })

  // Paso 2: Crear perfil (usa la misma transacción automáticamente)
  const profile = await this.profileRepository.save({
    userId: user.id,
    bio: data.bio,
  })

  // Paso 3: Actualizar usuario con profileId
  await this.userRepository.update(user.id, {
    profileId: profile.id,
  })

  // Si cualquier paso falla, TODO se revierte
  return { user, profile }
}
```

### Ejemplo 2: Transferencia de Datos

```typescript
@Transactional()
async transferData(fromUserId: string, toUserId: string) {
  const fromUser = await this.userRepository.findById(fromUserId)
  const toUser = await this.userRepository.findById(toUserId)

  if (!fromUser || !toUser) {
    throw new Error('Usuario no encontrado')
  }

  // Transferir datos
  await this.userRepository.update(toUserId, {
    credits: toUser.credits + fromUser.credits,
  })

  // Marcar usuario original como inactivo
  await this.userRepository.softDelete(fromUserId)

  // Si algo falla, ambas operaciones se revierten
  return { success: true }
}
```

### Ejemplo 3: Validación con Rollback

```typescript
@Transactional()
async updateUserEmail(userId: string, newEmail: string) {
  // Validar que el email no esté en uso
  const existingUser = await this.userRepository.findByEmail(newEmail)
  if (existingUser && existingUser.id !== userId) {
    // Esto hace rollback automático
    throw new Error('Email ya está en uso')
  }

  // Actualizar email
  await this.userRepository.updateEmail(userId, newEmail)

  // Enviar email de confirmación
  await this.emailService.sendEmailChanged(newEmail)

  // Si el envío de email falla, el update también se revierte
  return { success: true }
}
```

### Ejemplo 4: Transacciones Anidadas

```typescript
@Transactional()
async parentOperation() {
  // Esta es la transacción "padre"
  const user = await this.userRepository.save({ email: 'test@test.com' })

  // Llamar a otro método transaccional
  await this.childOperation(user.id)

  // childOperation reutiliza la misma transacción
  // No crea una transacción nueva
  return user
}

@Transactional()
async childOperation(userId: string) {
  // Si se llama desde parentOperation, reutiliza su transacción
  // Si se llama directamente, crea su propia transacción
  await this.userRepository.update(userId, { name: 'Updated' })
}
```

## Ventajas sobre AsyncLocalStorage Manual

### ✅ Con CLS (nestjs-cls)
```typescript
@Transactional()
async createUser(data: CreateUserDto) {
  // ✅ No necesitas pasar entityManager
  await this.userRepository.save(data)
  await this.profileRepository.save({ userId: user.id })
}
```

### ❌ Sin CLS (manual)
```typescript
async createUser(data: CreateUserDto) {
  return await this.dataSource.transaction(async (entityManager) => {
    // ❌ Tienes que pasar entityManager a TODOS los repositorios
    await this.userRepository.save(data, entityManager)
    await this.profileRepository.save({ userId: user.id }, entityManager)
  })
}
```

## Características

### ✅ Request Scope
CLS funciona perfectamente con request scope. Cada request tiene su propio contexto aislado.

### ✅ Transacciones Anidadas
Si llamas a un método `@Transactional()` desde otro método `@Transactional()`, reutiliza la transacción padre en lugar de crear una nueva.

### ✅ Rollback Automático
Si hay cualquier error (throw), la transacción se revierte automáticamente.

### ✅ Sin Parámetros Extra
No necesitas pasar `entityManager` por todos lados. Se obtiene automáticamente de CLS.

### ✅ Compatible con Código Existente
Si pasas `entityManager` explícitamente, tiene prioridad sobre CLS.

## Debugging

### Ver el EntityManager Actual

```typescript
import { TransactionService } from '@core/database'

@Injectable()
export class DebugService {
  constructor(private readonly transactionService: TransactionService) {}

  debugTransaction() {
    const em = this.transactionService.getCurrentEntityManager()
    if (em) {
      console.log('Hay una transacción activa')
    } else {
      console.log('No hay transacción activa')
    }
  }
}
```

### Logging de Transacciones

```typescript
@Transactional()
async myMethod() {
  console.log('Inicio de transacción')

  try {
    await this.userRepository.save(data)
    console.log('Usuario guardado')

    await this.profileRepository.save(profile)
    console.log('Perfil guardado')

    console.log('Transacción completada (commit)')
  } catch (error) {
    console.log('Error - Rollback automático:', error)
    throw error
  }
}
```

## Troubleshooting

### Error: "Cannot read property 'get' of undefined"

**Causa:** `ClsService` no está inyectado en el repository.

**Solución:**
```typescript
constructor(
  @InjectRepository(User) repository: Repository<User>,
  cls: ClsService, // ← Asegúrate de inyectar CLS
) {
  super(repository, cls)
}
```

### Transacción no se aplica

**Causa:** El método no está marcado con `@Transactional()` o no usas `runInTransaction()`.

**Solución:**
```typescript
// ✅ Correcto
@Transactional()
async myMethod() { }

// ❌ Incorrecto
async myMethod() {
  // Sin decorador, no hay transacción
}
```

### EntityManager undefined en Repository

**Causa:** Estás llamando al repository fuera de una transacción pero esperando que use el EntityManager de CLS.

**Solución:** Solo usa CLS dentro de métodos `@Transactional()` o `runInTransaction()`.

## Migración desde AsyncLocalStorage

Si ya tenías código usando `TransactionManager` con AsyncLocalStorage:

### Antes (AsyncLocalStorage)
```typescript
await this.transactionManager.runInTransaction(async (em) => {
  await this.userRepository.save(data, em) // ← Pasabas em manualmente
})
```

### Después (CLS)
```typescript
@Transactional()
async myMethod() {
  await this.userRepository.save(data) // ← Sin pasar em
}
```

## Best Practices

### ✅ Usar @Transactional para lógica de negocio

```typescript
@Transactional()
async createOrder(data: CreateOrderDto) {
  const order = await this.orderRepository.save(data)
  await this.inventoryService.decrementStock(data.items)
  await this.paymentService.charge(data.amount)
  return order
}
```

### ✅ NO usar @Transactional para consultas simples

```typescript
// ❌ Innecesario
@Transactional()
async findUser(id: string) {
  return await this.userRepository.findById(id)
}

// ✅ Mejor
async findUser(id: string) {
  return await this.userRepository.findById(id)
}
```

### ✅ Manejo de errores dentro de transacciones

```typescript
@Transactional()
async processPayment(orderId: string) {
  try {
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      // Esto hace rollback
      throw new NotFoundException('Orden no encontrada')
    }

    await this.paymentService.charge(order.total)
    await this.orderRepository.update(orderId, { status: 'PAID' })

    return { success: true }
  } catch (error) {
    // El rollback ya se hizo automáticamente
    throw error
  }
}
```

## Performance

CLS tiene un overhead mínimo (~1-2% en benchmarks). Es mucho más eficiente que pasar parámetros manualmente y más seguro que variables globales.

## Testing

En tests, puedes usar `runWithEntityManager`:

```typescript
it('should create user in transaction', async () => {
  const em = dataSource.createEntityManager()

  await transactionService.runWithEntityManager(em, async () => {
    await userService.createUser({ email: 'test@test.com' })
  })

  // Verificar que se usó el EntityManager correcto
})
```
