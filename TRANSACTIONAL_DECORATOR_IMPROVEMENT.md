# 🔧 Mejora del Decorador @Transactional()

## ✅ Cambio Aplicado

Se migró el decorador `@Transactional()` de una versión con "inyección mágica" a una versión más segura y explícita.

---

## ❌ ANTES: Inyección Mágica (Problemática)

### Código Anterior
```typescript
export function Transactional(): MethodDecorator {
  const injectTransactionService = Inject(TransactionService)  // ❌ Intenta inyectar

  return (target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    injectTransactionService(target, 'transactionService')  // ❌ Inyección mágica

    const originalMethod = descriptor.value as AsyncMethod

    descriptor.value = async function (this: WithTransactionService, ...args: unknown[]) {
      const transactionService = this.transactionService

      if (!transactionService) {
        throw new Error('@Transactional() requires TransactionService to be injected')
      }

      return await transactionService.runInTransaction(async () => {
        return await originalMethod.apply(this, args)
      })
    }

    return descriptor
  }
}
```

### Problemas de Esta Versión

1. **❌ Inyección Forzada en el Prototipo**
   ```typescript
   injectTransactionService(target, 'transactionService')  // Intenta forzar inyección
   ```
   - Intenta inyectar `transactionService` directamente en el prototipo
   - NestJS puede no reconocer la propiedad si no está en el constructor
   - Es "magia" que puede fallar silenciosamente

2. **❌ Dependencia de Decorador Nest**
   ```typescript
   const injectTransactionService = Inject(TransactionService)
   ```
   - Depende del decorador `@Inject()` de NestJS
   - Comportamiento no garantizado fuera del constructor

3. **❌ Difícil de Debuggear**
   - Si falla la inyección, el error puede ser confuso
   - No queda claro si el problema es del decorador o de la inyección

---

## ✅ DESPUÉS: Inyección Explícita (Recomendada)

### Código Nuevo
```typescript
interface WithTransactionService {
  transactionService: TransactionService
  constructor: { name: string }
}

export function Transactional(): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (
      this: WithTransactionService,
      ...args: unknown[]
    ): Promise<unknown> {
      // ✅ Busca transactionService en la instancia (debe estar en constructor)
      const transactionService = this.transactionService

      if (!transactionService) {
        throw new Error(
          `El decorador @Transactional() requiere que 'transactionService' esté inyectado en el constructor de ${this.constructor.name}. ` +
          `Ejemplo: constructor(private readonly transactionService: TransactionService, ...) {}`
        )
      }

      // Ejecutar en transacción
      return await transactionService.runInTransaction(async () => {
        return await originalMethod.apply(this, args)
      })
    }

    return descriptor
  }
}
```

### Ventajas de Esta Versión

1. **✅ Sin Inyección Mágica**
   - El decorador NO intenta inyectar nada
   - Solo verifica que `transactionService` exista en la instancia
   - Confía en NestJS para hacer su trabajo normal de inyección

2. **✅ Error Claro y Descriptivo**
   ```typescript
   if (!transactionService) {
     throw new Error(
       `El decorador @Transactional() requiere que 'transactionService' esté inyectado en el constructor de ${this.constructor.name}. ` +
       `Ejemplo: constructor(private readonly transactionService: TransactionService, ...) {}`
     )
   }
   ```
   - Si olvidas inyectar `transactionService`, obtienes un error claro
   - El error incluye el nombre de la clase que falló
   - Proporciona un ejemplo de cómo arreglarlo

3. **✅ Inyección Explícita en Constructor**
   ```typescript
   @Injectable()
   export class UsersService {
     constructor(
       private readonly transactionService: TransactionService,  // ✅ EXPLÍCITO
       private readonly userRepository: UserRepository,
     ) {}

     @Transactional()
     async createUser(dto: CreateUserDto) {
       // Funciona porque transactionService está en el constructor
     }
   }
   ```

4. **✅ Más Robusto**
   - NestJS hace la inyección de forma normal y garantizada
   - El decorador solo verifica que existe y la usa
   - Menos "magia", más explícito

5. **✅ Mejor Tipado**
   ```typescript
   interface WithTransactionService {
     transactionService: TransactionService
     constructor: { name: string }
   }

   descriptor.value = async function (
     this: WithTransactionService,  // ✅ Tipado correcto
     ...args: unknown[]
   ): Promise<unknown>
   ```

---

## 📊 Comparación

| Aspecto | ANTES (Inyección Mágica) | DESPUÉS (Inyección Explícita) |
|---------|-------------------------|-------------------------------|
| **Inyección** | ❌ Forzada en prototipo | ✅ Explícita en constructor |
| **Comportamiento** | ❌ Puede fallar silenciosamente | ✅ Falla con error claro |
| **Dependencias** | ❌ Depende de @Inject() | ✅ Solo verifica existencia |
| **Debugging** | ❌ Difícil | ✅ Fácil (error descriptivo) |
| **Robustez** | ❌ Puede fallar en edge cases | ✅ Robusto |
| **Claridad** | ❌ "Mágico" | ✅ Explícito |

---

## 🎯 Cómo Usar el Decorador Correctamente

### ✅ USO CORRECTO

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly transactionService: TransactionService,  // ✅ REQUERIDO
    private readonly userRepository: UserRepository,
  ) {}

  @Transactional()
  async createUserWithProfile(userData: CreateUserDto) {
    // Todo dentro de esta función se ejecuta en una transacción
    const user = await this.userRepository.save(userData)
    const profile = await this.profileRepository.save({ userId: user.id })
    return { user, profile }
  }
}
```

**¿Por qué funciona?**
- `transactionService` está inyectado en el constructor ✅
- NestJS maneja la inyección de forma normal ✅
- El decorador encuentra `transactionService` en `this` ✅

### ❌ USO INCORRECTO

```typescript
@Injectable()
export class UsersService {
  constructor(
    // ❌ Falta transactionService
    private readonly userRepository: UserRepository,
  ) {}

  @Transactional()
  async createUser(userData: CreateUserDto) {
    // ❌ ERROR en runtime
  }
}
```

**¿Qué pasa?**
- Al ejecutar el método, el decorador verifica `this.transactionService`
- No encuentra la propiedad
- Lanza error claro:
  ```
  Error: El decorador @Transactional() requiere que 'transactionService' esté inyectado en el constructor de UsersService.
  Ejemplo: constructor(private readonly transactionService: TransactionService, ...) {}
  ```

---

## 🧪 Verificación

### Tests Ejecutados
```bash
$ npm test

PASS src/app.controller.spec.ts
PASS src/modules/organizations/factories/organization.factory.spec.ts
PASS src/@core/repositories/base.repository.spec.ts
PASS src/modules/organizations/validators/organization.validator.spec.ts
PASS src/modules/organizations/services/organizations.service.spec.ts
PASS src/modules/users/services/users.service.spec.ts
PASS src/modules/users/factories/user.factory.spec.ts

Test Suites: 7 passed, 7 total
Tests:       112 passed, 112 total ✅
Time:        5.205 s
```

### Servicios Verificados
- ✅ `UsersService` - 5 métodos con `@Transactional()`
- ✅ Todos tienen `transactionService` en el constructor
- ✅ Todos los tests pasando

---

## 📚 Referencias

### Archivos Modificados
- `src/@core/database/transactional.decorator.ts` - Decorador mejorado

### Archivos que Usan el Decorador
- `src/modules/users/services/users.service.ts` (5 usos)

---

## 💡 Puntos Clave

1. **No más "inyección mágica"** - El decorador NO intenta inyectar nada
2. **Inyección explícita requerida** - DEBES poner `transactionService` en el constructor
3. **Error claro si olvidas** - El decorador te dice exactamente qué falta y cómo arreglarlo
4. **Más robusto** - Confía en NestJS para hacer la inyección de forma normal
5. **Mejor tipado** - Usa interfaces para tipar `this` correctamente

---

## 🎉 Resultado

✅ **Decorador mejorado y más seguro**
✅ **Todos los tests pasando (112/112)**
✅ **Sin inyección mágica problemática**
✅ **Errores claros y descriptivos**
✅ **Código más mantenible**

---

**Aplicado:** 2026-01-07
**Autor:** Mejora basada en feedback de la comunidad
**Estado:** ✅ Implementado y verificado
