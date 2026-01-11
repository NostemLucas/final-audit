# Soluciones al Problema de Dependencias Circulares

## 🔴 Problema Actual

```
UsersModule → OrganizationsModule
      ↑              ↓
      └──────────────┘
    (Dependencia Circular)
```

**UserValidator** necesita `ORGANIZATION_REPOSITORY` para validar que la organización existe.

---

## ✅ Solución 1: PersistenceModule (RECOMENDADO PARA PROYECTOS MEDIANOS/GRANDES)

Crear un módulo de persistencia centralizado que exporte todos los repositorios.

### Estructura propuesta:

```
src/
├── @core/
│   └── persistence/
│       ├── persistence.module.ts
│       └── index.ts
└── modules/
    ├── users/
    │   ├── entities/
    │   ├── repositories/
    │   └── users.module.ts
    └── organizations/
        ├── entities/
        ├── repositories/
        └── organizations.module.ts
```

### Implementación:

**`src/@core/persistence/persistence.module.ts`**
```typescript
import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// Entities
import { UserEntity } from '../../modules/users/entities/user.entity'
import { OrganizationEntity } from '../../modules/organizations/entities/organization.entity'

// Repositories
import { UsersRepository } from '../../modules/users/repositories/users.repository'
import { OrganizationRepository } from '../../modules/organizations/repositories/organization.repository'

// Tokens
import { USERS_REPOSITORY } from '../../modules/users/repositories'
import { ORGANIZATION_REPOSITORY } from '../../modules/organizations/repositories'

/**
 * Módulo de persistencia centralizado
 *
 * Propósito:
 * - Eliminar dependencias circulares entre módulos
 * - Centralizar configuración de TypeORM
 * - Exportar repositorios para uso global
 *
 * Es Global para evitar re-importar en cada módulo
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OrganizationEntity,
      // ... otros entities
    ]),
  ],
  providers: [
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
    // ... otros repositorios
  ],
  exports: [
    USERS_REPOSITORY,
    ORGANIZATION_REPOSITORY,
    // ... otros repositorios
  ],
})
export class PersistenceModule {}
```

**`src/@core/persistence/index.ts`**
```typescript
export * from './persistence.module'
```

**Actualizar `src/@core/index.ts`**
```typescript
export * from './persistence'
// ... otros exports
```

**Actualizar `UsersModule`:**
```typescript
import { Module } from '@nestjs/common'
// ❌ ELIMINAR: import { TypeOrmModule } from '@nestjs/typeorm'
// ❌ ELIMINAR: import { UserEntity } from './entities/user.entity'
// ❌ ELIMINAR: import { OrganizationsModule } from '../organizations/organizations.module'

@Module({
  imports: [
    // ❌ ELIMINAR: TypeOrmModule.forFeature([UserEntity])
    // ❌ ELIMINAR: OrganizationsModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    // Use Cases...
    UserValidator,
    UserFactory,
    // ❌ ELIMINAR el provider de USERS_REPOSITORY (ya está en PersistenceModule)
  ],
  exports: [], // ❌ ELIMINAR exports (ya está en PersistenceModule)
})
export class UsersModule {}
```

**Actualizar `OrganizationsModule`:**
```typescript
import { Module } from '@nestjs/common'
// ❌ ELIMINAR: import { TypeOrmModule } from '@nestjs/typeorm'
// ❌ ELIMINAR: import { OrganizationEntity } from './entities/organization.entity'
// ❌ ELIMINAR: import { UsersModule } from '../users'

@Module({
  imports: [],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    // Use Cases...
    OrganizationValidator,
    OrganizationFactory,
    // ❌ ELIMINAR el provider de ORGANIZATION_REPOSITORY
  ],
  exports: [],
})
export class OrganizationsModule {}
```

**Actualizar `AppModule`:**
```typescript
import { Module } from '@nestjs/common'
import { PersistenceModule } from './@core/persistence'
import { UsersModule } from './modules/users/users.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'

@Module({
  imports: [
    // ... DatabaseModule, etc
    PersistenceModule, // ✅ Importar UNA SOLA VEZ
    UsersModule,
    OrganizationsModule,
  ],
})
export class AppModule {}
```

### ✅ Ventajas:
- Elimina dependencias circulares completamente
- Centraliza gestión de repositorios
- Fácil de testear (mock del PersistenceModule)
- Escalable (agregar nuevos repos es fácil)
- Patrón usado en proyectos enterprise

### ❌ Desventajas:
- Todos los repositorios están en un solo módulo
- Puede crecer mucho si tienes 50+ entidades

---

## ✅ Solución 2: Query Directa en Repositorios (MÁS LIMPIO)

En lugar de que `UserValidator` dependa de `OrganizationRepository`, hacer que `UsersRepository` tenga un método para validar organizaciones.

### Implementación:

**Actualizar `IUsersRepository`:**
```typescript
export interface IUsersRepository extends IBaseRepository<UserEntity> {
  // ... métodos existentes

  /**
   * Valida que una organización existe y está activa
   * Query directa sin depender de OrganizationRepository
   */
  validateOrganizationExists(organizationId: string): Promise<boolean>
}
```

**Actualizar `UsersRepository`:**
```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClsService } from 'nestjs-cls'
import { BaseRepository } from '@core/repositories'
import { UserEntity } from '../entities/user.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity' // Solo importar entity, NO el módulo
import type { IUsersRepository } from './users-repository.interface'

@Injectable()
export class UsersRepository
  extends BaseRepository<UserEntity>
  implements IUsersRepository
{
  constructor(
    @InjectRepository(UserEntity) repository: Repository<UserEntity>,
    cls: ClsService,
  ) {
    super(repository, cls)
  }

  // ... métodos existentes

  /**
   * Valida que una organización existe usando query directa
   * NO necesita inyectar OrganizationRepository
   */
  async validateOrganizationExists(organizationId: string): Promise<boolean> {
    const count = await this.getRepo()
      .createQueryBuilder('organization')
      .from(OrganizationEntity, 'organization')
      .where('organization.id = :id', { id: organizationId })
      .andWhere('organization.isActive = :isActive', { isActive: true })
      .getCount()

    return count > 0
  }
}
```

**Actualizar `UserValidator`:**
```typescript
import { Injectable, Inject } from '@nestjs/common'
import { USERS_REPOSITORY } from '../repositories'
import type { IUsersRepository } from '../repositories'
// ❌ ELIMINAR: import { ORGANIZATION_REPOSITORY } from '../../organizations'
// ❌ ELIMINAR: import type { IOrganizationRepository } from '../../organizations'

@Injectable()
export class UserValidator {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    // ❌ ELIMINAR: @Inject(ORGANIZATION_REPOSITORY) private readonly organizationRepository
  ) {}

  // ... otros métodos

  async validateOrganizationExists(organizationId: string): Promise<void> {
    const exists = await this.usersRepository.validateOrganizationExists(
      organizationId,
    )

    if (!exists) {
      throw new OrganizationNotFoundForUserException(organizationId)
    }
  }
}
```

**Actualizar `UsersModule`:**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    // ❌ ELIMINAR: OrganizationsModule
  ],
  // ... resto igual
})
export class UsersModule {}
```

### ✅ Ventajas:
- No hay dependencias circulares
- Cada módulo es independiente
- Repositorios auto-contenidos
- No necesitas PersistenceModule
- Mejor para proyectos pequeños/medianos

### ❌ Desventajas:
- Queries duplicadas si varios validadores necesitan lo mismo
- Repositorio "sabe" de otras entidades

---

## ✅ Solución 3: forwardRef() (NO RECOMENDADO - Solo temporal)

Usar `forwardRef()` de NestJS para resolver la circular reference.

```typescript
// UsersModule
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => OrganizationsModule), // ✅ forwardRef
  ],
})
export class UsersModule {}

// OrganizationsModule
@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity]),
    forwardRef(() => UsersModule), // ✅ forwardRef
  ],
})
export class OrganizationsModule {}
```

### ✅ Ventajas:
- Rápido de implementar
- No cambias arquitectura

### ❌ Desventajas:
- Es un **code smell** (indica mal diseño)
- Dificulta testing
- Puede causar problemas de inicialización
- No escalable

---

## 🎯 Recomendación Final

**Para tu proyecto:**

### Opción A: Si tienes < 10 módulos
👉 **Usa Solución 2 (Query Directa)**
- Más simple
- Menos boilerplate
- Módulos independientes

### Opción B: Si tienes 10+ módulos o planeas crecer
👉 **Usa Solución 1 (PersistenceModule)**
- Más profesional
- Escalable
- Patrón enterprise

### Opción C: Si necesitas arreglo URGENTE (demo, presentación)
👉 **Usa Solución 3 (forwardRef)**
- Solo temporal
- Refactoriza después

---

## 📝 Validadores Compartidos

Si varios módulos usan el mismo validador, puedes moverlos a `@core/validators`:

```
src/@core/validators/
├── organization-existence.validator.ts
├── user-existence.validator.ts
└── index.ts
```

Pero esto solo tiene sentido si son validaciones **genéricas** usadas por 3+ módulos.

---

## 🧪 Testing con cada solución

### Con PersistenceModule:
```typescript
const module = await Test.createTestingModule({
  imports: [PersistenceModule],
  providers: [UserValidator],
})
  .overrideProvider(ORGANIZATION_REPOSITORY)
  .useValue(mockOrganizationRepository)
  .compile()
```

### Con Query Directa:
```typescript
const module = await Test.createTestingModule({
  providers: [
    UserValidator,
    {
      provide: USERS_REPOSITORY,
      useValue: mockUsersRepository, // Mock incluye validateOrganizationExists
    },
  ],
}).compile()
```
