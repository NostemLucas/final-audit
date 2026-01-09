# Transaction Discovery System

## Descripción

El sistema de **Transaction Discovery** permite usar el decorador `@Transactional()` sin necesidad de inyectar manualmente el `TransactionService` en cada servicio. Esto elimina código repetitivo (boilerplate) y hace el código más limpio.

## Cómo Funciona

### 1. El Decorador (Metadata)

El decorador `@Transactional()` ya NO ejecuta lógica de transacciones directamente. Su única función es **marcar el método** con metadata usando `Reflect.defineMetadata`:

```typescript
export function Transactional(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Solo guardamos metadata para que el Discovery lo encuentre
    Reflect.defineMetadata(TRANSACTIONAL_METADATA_KEY, true, target, propertyKey)
    return descriptor
  }
}
```

### 2. El Discovery Service (Scanner)

El `TransactionDiscoveryService` se ejecuta al iniciar la aplicación (`onModuleInit`) y:

1. **Escanea** todos los proveedores registrados en NestJS
2. **Busca** métodos marcados con el metadata de `@Transactional()`
3. **Envuelve** esos métodos con lógica transaccional automáticamente

```typescript
@Injectable()
export class TransactionDiscoveryService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    const providers = this.discoveryService.getProviders()

    for (const wrapper of providers) {
      const { instance } = wrapper
      const prototype = Object.getPrototypeOf(instance)
      const methodNames = this.metadataScanner.getAllMethodNames(prototype)

      for (const methodName of methodNames) {
        const isTransactional = Reflect.getMetadata(
          TRANSACTIONAL_METADATA_KEY,
          prototype,
          methodName,
        )

        if (isTransactional) {
          this.wrapMethodWithTransaction(instance, prototype, methodName, wrapper)
        }
      }
    }
  }
}
```

### 3. El Wrapper (Lógica de Transacción)

Cuando el Discovery encuentra un método marcado con `@Transactional()`, lo reemplaza con una versión envuelta:

```typescript
private wrapMethodWithTransaction(instance: any, prototype: any, methodName: string): void {
  const originalMethod = prototype[methodName]
  const transactionService = this.transactionService

  prototype[methodName] = async function (this: any, ...args: unknown[]) {
    return await transactionService.runInTransaction(async () => {
      return await originalMethod.apply(this, args)
    })
  }
}
```

## Beneficios

### Antes (Sin Discovery)

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly transactionService: TransactionService, // ❌ Inyección manual requerida
  ) {}

  @Transactional()
  async create(dto: CreateUserDto): Promise<UserEntity> {
    return await this.usersRepository.save(dto)
  }
}
```

**Problemas:**
- Código repetitivo en CADA servicio que use transacciones
- Fácil olvidar inyectar `TransactionService`
- Más líneas de código
- Dependencia explícita innecesaria

### Después (Con Discovery)

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: IUsersRepository,
    // ✅ Ya NO necesitas TransactionService
  ) {}

  @Transactional()
  async create(dto: CreateUserDto): Promise<UserEntity> {
    return await this.usersRepository.save(dto)
  }
}
```

**Ventajas:**
- ✅ Código más limpio y simple
- ✅ Sin dependencias innecesarias
- ✅ Menos boilerplate
- ✅ Decorador funciona automáticamente
- ✅ Sistema escalable para todos los servicios

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│ 1. Aplicación inicia                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. DatabaseModule se carga                              │
│    - TransactionService registrado                      │
│    - TransactionDiscoveryService registrado             │
│    - DiscoveryModule importado                          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. TransactionDiscoveryService.onModuleInit()           │
│    - Escanea TODOS los proveedores                      │
│    - Busca métodos con metadata @Transactional()        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Métodos encontrados son envueltos                    │
│    - originalMethod guardado                            │
│    - prototype[methodName] reemplazado con wrapper      │
│    - wrapper ejecuta transactionService.runInTransaction│
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Aplicación lista                                     │
│    - @Transactional() funciona automáticamente          │
│    - Sin necesidad de inyectar TransactionService       │
└─────────────────────────────────────────────────────────┘
```

## Uso

### Decorar un Método

Simplemente usa el decorador `@Transactional()` en cualquier método que necesite ejecutarse en una transacción:

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: IOrdersRepository,
    private readonly productsRepository: IProductsRepository,
  ) {}

  @Transactional()
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Todo aquí se ejecuta dentro de una transacción
    const order = await this.ordersRepository.save(dto)
    await this.productsRepository.updateStock(dto.productId, dto.quantity)

    // Si algo falla, se hace rollback automático
    return order
  }
}
```

### Testing

Los tests NO necesitan cambios. El Discovery solo se ejecuta cuando se inicializa el módulo completo:

```typescript
describe('UsersService', () => {
  let service: UsersService
  let repository: FakeUsersRepository

  beforeEach(async () => {
    repository = new FakeUsersRepository()

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: repository },
        // ✅ Ya NO necesitas proveer TransactionService en tests unitarios
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it('debe crear un usuario', async () => {
    const dto: CreateUserDto = { /* ... */ }
    const result = await service.create(dto)
    expect(result).toBeDefined()
  })
})
```

**Nota:** En tests unitarios, el `@Transactional()` NO se aplica porque el `TransactionDiscoveryService` no se ejecuta. Si necesitas probar la lógica transaccional, debes hacer tests de integración o E2E.

## Logging

El Discovery Service registra logs cuando encuentra y envuelve métodos:

```
[TransactionDiscoveryService] Iniciando escaneo de métodos @Transactional()...
[TransactionDiscoveryService] Envolviendo método UsersService.create con transacción
[TransactionDiscoveryService] Envolviendo método UsersService.update con transacción
[TransactionDiscoveryService] Envolviendo método OrdersService.createOrder con transacción
[TransactionDiscoveryService] ✅ Escaneo completado: 3 métodos envueltos con @Transactional()
```

Esto te permite verificar en los logs que el Discovery está funcionando correctamente.

## Requisitos Técnicos

### Dependencias

- `reflect-metadata` - Para guardar y leer metadata
- `@nestjs/core` - Para `DiscoveryModule`, `DiscoveryService`, `MetadataScanner`
- `nestjs-cls` - Para CLS (Continuation Local Storage)

### Configuración en DatabaseModule

```typescript
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({ /* ... */ }),
    ClsModule.forRoot({ /* ... */ }),
    DiscoveryModule, // ✅ Requerido para escanear proveedores
  ],
  providers: [
    TransactionService,
    TransactionDiscoveryService, // ✅ Requerido para el Discovery
  ],
  exports: [TransactionService, ClsModule],
})
export class DatabaseModule {}
```

## Limitaciones

1. **Solo funciona con proveedores registrados**: Si una clase no está registrada en el contenedor de NestJS, el Discovery no la encontrará.

2. **No funciona en tests unitarios simples**: El Discovery se ejecuta en `onModuleInit`, que solo ocurre cuando se compila un módulo completo. En tests unitarios que solo instancian la clase directamente, no se aplicará el wrapping.

3. **Métodos privados**: Solo se escanean métodos en el prototype, así que funciona mejor con métodos públicos y protected.

## Comparación con Otras Soluciones

### vs. Inyección Manual de TransactionService

| Aspecto | Discovery | Inyección Manual |
|---------|-----------|------------------|
| Boilerplate | ✅ Mínimo | ❌ Alto |
| Facilidad de uso | ✅ Muy fácil | ⚠️ Requiere recordar inyectar |
| Testabilidad | ✅ Simple | ⚠️ Requiere mock en cada test |
| Performance | ✅ Igual | ✅ Igual |
| Escalabilidad | ✅ Excelente | ❌ Repetitivo |

### vs. TypeORM @Transaction Decorator

| Aspecto | Nuestro Discovery | TypeORM @Transaction |
|---------|-------------------|---------------------|
| Integración CLS | ✅ Completa | ❌ No soporta |
| BaseRepository | ✅ Funciona perfectamente | ❌ Requiere pasar EM |
| Control | ✅ Total | ⚠️ Limitado |
| Flexibilidad | ✅ Alta | ⚠️ Media |

## Referencias

- [NestJS Discovery Module](https://docs.nestjs.com/recipes/nest-commander#discovery)
- [Reflect Metadata](https://github.com/rbuckton/reflect-metadata)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
