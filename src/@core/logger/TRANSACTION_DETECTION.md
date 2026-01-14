# Detección de Transacciones en el Logger

El `TypeOrmDatabaseLogger` ahora detecta automáticamente cuando las queries se ejecutan dentro de una transacción y las marca visualmente con `[TRX]`.

## Cómo Funciona

TypeORM pasa un objeto `QueryRunner` a cada método del logger. Este objeto tiene una propiedad `isTransactionActive` que indica si hay una transacción activa.

El logger ahora:
1. ✅ Detecta si `queryRunner?.isTransactionActive === true`
2. ✅ Agrega el marcador `[TRX]` al nombre de la operación
3. ✅ Incluye `inTransaction: true/false` en los datos adicionales

## Ejemplo Visual

### Sin Transacción
```
23:16:47 ⚙ DEBUG [database] Database Query Executed [QUERY]
────────────────────────────────────────────────────────────────────────────────
  │ SELECT * FROM users WHERE id = $1
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 5ms
  │ inTransaction: false
  └─
```

### Con Transacción
```
23:16:48 ⚙ DEBUG [database] Database Query Executed [QUERY [TRX]]
────────────────────────────────────────────────────────────────────────────────
  │ INSERT INTO users (name, email) VALUES ($1, $2)
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 3ms
  │ inTransaction: true    👈 Ahora puedes ver que está en transacción
  └─
```

## Ejemplo de Código

```typescript
import { Injectable } from '@nestjs/common'
import { TransactionService } from '@core/database'
import { UserRepository } from './user.repository'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  // Todas las queries dentro de este método mostrarán [TRX] en los logs
  @Transactional()
  async createUserWithProfile(data: CreateUserDto) {
    // ✅ Log mostrará: [QUERY [TRX]]
    const user = await this.userRepository.save({
      name: data.name,
      email: data.email,
    })

    // ✅ Log mostrará: [QUERY [TRX]]
    const profile = await this.profileRepository.save({
      userId: user.id,
      bio: data.bio,
    })

    // Si hay error, rollback automático
    return { user, profile }
  }

  // Queries fuera de transacción NO mostrarán [TRX]
  async findUser(id: string) {
    // ✅ Log mostrará: [QUERY] (sin [TRX])
    return await this.userRepository.findById(id)
  }
}
```

## Beneficios

### 1. Debugging más Fácil
Puedes ver de un vistazo qué queries están agrupadas en la misma transacción:

```
23:16:48 ⚙ DEBUG [database] Database Query Executed [QUERY [TRX]]  👈 Inicio transacción
23:16:48 ⚙ DEBUG [database] Database Query Executed [QUERY [TRX]]
23:16:48 ⚙ DEBUG [database] Database Query Executed [QUERY [TRX]]  👈 Fin transacción
23:16:49 ⚙ DEBUG [database] Database Query Executed [QUERY]        👈 Fuera de transacción
```

### 2. Detección de Problemas
Si ves queries que DEBERÍAN estar en transacción pero no tienen `[TRX]`, sabes que hay un problema:

```typescript
// ❌ MAL: Estas queries NO están en transacción (no hay [TRX])
async createUserWithProfile(data: CreateUserDto) {
  const user = await this.userRepository.save(data)        // [QUERY]
  const profile = await this.profileRepository.save(...)   // [QUERY]
  // Si la segunda falla, la primera NO se revierte ⚠️
}

// ✅ BIEN: Ambas queries muestran [TRX]
@Transactional()
async createUserWithProfile(data: CreateUserDto) {
  const user = await this.userRepository.save(data)        // [QUERY [TRX]]
  const profile = await this.profileRepository.save(...)   // [QUERY [TRX]]
  // Si falla, ambas se revierten ✅
}
```

### 3. Auditoría de Performance
Queries lentas dentro de transacciones son especialmente problemáticas (bloquean la BD):

```
23:16:50 ⚠ WARN [database] Slow Query Detected [SLOW_QUERY [TRX]]  ⚠️ CRÍTICO!
────────────────────────────────────────────────────────────────────────────────
  │ SELECT * FROM orders WHERE date > NOW() - INTERVAL '1 year'
────────────────────────────────────────────────────────────────────────────────
  ┌─ Additional Data:
  │ duration: 2500ms
  │ threshold: 1000ms
  │ inTransaction: true    👈 Bloqueando la transacción por 2.5s!
  └─
```

## Métodos que Detectan Transacciones

Todos estos métodos ahora incluyen detección de transacciones:

- ✅ `logQuery()` → `[QUERY [TRX]]`
- ✅ `logQueryError()` → `[QUERY_EXECUTION [TRX]]`
- ✅ `logQuerySlow()` → `[SLOW_QUERY [TRX]]`
- ✅ `logSchemaBuild()` → `[SCHEMA_BUILD [TRX]]`
- ✅ `logMigration()` → `[MIGRATION [TRX]]`
- ✅ `log()` → `[GENERAL [TRX]]`, `[SCHEMA [TRX]]`, etc.

## Notas Importantes

1. **Automático**: No necesitas cambiar nada en tu código, TypeORM pasa el `queryRunner` automáticamente
2. **Solo TypeORM**: Esta detección solo funciona con queries ejecutadas a través de TypeORM
3. **Sin Overhead**: La detección es instantánea (solo lee una propiedad booleana)
4. **Backwards Compatible**: Si `queryRunner` es `undefined`, no muestra `[TRX]` (comportamiento por defecto)
