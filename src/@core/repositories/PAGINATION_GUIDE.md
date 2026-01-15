# 📖 Guía de Paginación Mejorada - BaseRepository

Esta guía explica cómo usar los nuevos métodos de paginación del `BaseRepository` que permiten reutilizar la lógica del padre sin duplicar código.

---

## 🎯 Problema que Resuelve

**Antes:** Cada repositorio hijo tenía que duplicar toda la lógica de paginación para agregar filtros o mapear datos.

**Ahora:** El `BaseRepository` ofrece métodos protegidos que permiten:
- ✅ Agregar filtros personalizados
- ✅ Mapear resultados a DTOs
- ✅ Reutilizar toda la lógica de paginación

---

## 🔧 Métodos Disponibles en BaseRepository

### 1. `paginate(query)` - Paginación básica (público)

Paginación simple sin filtros ni mapeo.

```typescript
// En cualquier repositorio hijo
const users = await this.usersRepository.paginate({ page: 1, limit: 10 })
// Retorna: PaginatedResponse<UserEntity>
```

**Cuándo usar:** Cuando no necesitas filtros personalizados ni mapeo.

---

### 2. `paginateWithOptions(query, options)` - Con filtros (protegido)

Paginación con filtros TypeORM (`where`, `relations`, `select`, etc.).

```typescript
// SOLO disponible en repositorios hijos
protected async paginateWithOptions(
  query: PaginationDto,
  options?: FindManyOptions<T>,
): Promise<PaginatedResponse<T>>
```

**Características:**
- ✅ Acepta `FindManyOptions` de TypeORM
- ✅ Filtra con WHERE (solo AND, no OR)
- ✅ Carga relaciones
- ✅ Select específico de campos
- ✅ Reutiliza toda la lógica del padre

**Ejemplo:**
```typescript
// En UserRepository
async paginateActiveUsers(dto: PaginationDto) {
  return super.paginateWithOptions(dto, {
    where: { status: UserStatus.ACTIVE },
    relations: ['organization'],
    select: ['id', 'email', 'names', 'lastNames'],
  })
}
```

---

### 3. `paginateWithMapper(query, mapper, options)` - Con mapeo (protegido)

Paginación con filtros Y transformación a DTO.

```typescript
// SOLO disponible en repositorios hijos
protected async paginateWithMapper<R>(
  query: PaginationDto,
  mapper: (entity: T) => R,
  options?: FindManyOptions<T>,
): Promise<PaginatedResponse<R>>
```

**Características:**
- ✅ Acepta función de mapeo `(entity: T) => R`
- ✅ Transforma cada resultado automáticamente
- ✅ Retorna `PaginatedResponse<R>` (tipo mapeado)
- ✅ Combina filtros + mapeo en un solo método

**Ejemplo:**
```typescript
// En UserRepository
async paginateAsDto(dto: PaginationDto, filters?: FindOptionsWhere<UserEntity>) {
  return super.paginateWithMapper<UserResponseDto>(
    dto,
    (user) => this.mapToDto(user),
    {
      where: filters,
      relations: ['organization'],
    }
  )
}

private mapToDto(user: UserEntity): UserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    // ...otros campos
  }
}
```

---

## 📋 Casos de Uso

### Caso 1: Filtros Simples (AND conditions)

```typescript
// UserRepository.ts
async paginateActiveUsers(dto: PaginationDto) {
  return super.paginateWithOptions(dto, {
    where: {
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    relations: ['organization'],
  })
}
```

**Uso:**
```typescript
const users = await usersRepo.paginateActiveUsers({ page: 1, limit: 10 })
```

---

### Caso 2: Filtros + Mapeo a DTO

```typescript
// UserRepository.ts
async paginateActiveAsDto(dto: PaginationDto) {
  return super.paginateWithMapper<UserResponseDto>(
    dto,
    (user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      organizationName: user.organization?.name || '',
    }),
    {
      where: { status: UserStatus.ACTIVE },
      relations: ['organization'],
    }
  )
}
```

**Uso:**
```typescript
const users = await usersRepo.paginateActiveAsDto({ page: 1, limit: 10 })
// Retorna: PaginatedResponse<UserResponseDto>
```

---

### Caso 3: Filtros Dinámicos

```typescript
// UserRepository.ts
async paginateWithDynamicFilters(
  dto: FindUsersDto
): Promise<PaginatedResponse<UserEntity>> {
  const where: FindOptionsWhere<UserEntity> = {}

  // Construir filtros dinámicamente
  if (dto.status) {
    where.status = dto.status
  }

  if (dto.organizationId) {
    where.organizationId = dto.organizationId
  }

  if (dto.onlyActive) {
    where.status = UserStatus.ACTIVE
  }

  // ✅ Reutilizar método del padre
  return super.paginateWithOptions(dto, {
    where,
    relations: ['organization'],
  })
}
```

---

### Caso 4: Filtros Complejos (OR, arrays) - QueryBuilder

Para filtros que `FindOptionsWhere` no soporta (OR, LIKE, ANY), usa QueryBuilder directamente:

```typescript
// UserRepository.ts
async paginateWithSearch(dto: FindUsersDto) {
  const { page = 1, limit = 10, search } = dto

  const queryBuilder = this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.organization', 'organization')

  // Filtros complejos con OR
  if (search) {
    queryBuilder.andWhere(
      '(LOWER(user.names) LIKE :search OR LOWER(user.email) LIKE :search)',
      { search: `%${search.toLowerCase()}%` }
    )
  }

  // Paginación manual
  const skip = (page - 1) * limit
  queryBuilder.skip(skip).take(limit)

  const [data, total] = await queryBuilder.getManyAndCount()

  // ✅ Reutilizar el builder de respuesta
  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

**Cuándo usar QueryBuilder:**
- ❌ Filtros simples AND → `paginateWithOptions()`
- ✅ Filtros OR
- ✅ Búsquedas LIKE
- ✅ Filtros en arrays (ANY, IN)
- ✅ Joins complejos

---

## 🚀 Ejemplo Completo: UserRepository

```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere } from 'typeorm'
import { BaseRepository } from '@core/repositories/base.repository'
import { UserEntity, UserStatus } from '../entities/user.entity'
import { PaginatedResponse, PaginatedResponseBuilder } from '@core/dtos'
import { FindUsersDto } from '../dtos/find-users.dto'
import { UserResponseDto } from '../dtos/user-response.dto'

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
    transactionService: TransactionService,
    auditService: AuditService,
  ) {
    super(repository, transactionService, auditService)
  }

  // ============================================
  // Opción 1: Filtros simples (AND)
  // ============================================
  async paginateSimple(
    dto: FindUsersDto,
    where?: FindOptionsWhere<UserEntity>,
  ): Promise<PaginatedResponse<UserEntity>> {
    return super.paginateWithOptions(dto, {
      where,
      relations: ['organization'],
    })
  }

  // ============================================
  // Opción 2: Filtros simples + Mapeo a DTO
  // ============================================
  async paginateSimpleAsDto(
    dto: FindUsersDto,
    where?: FindOptionsWhere<UserEntity>,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return super.paginateWithMapper<UserResponseDto>(
      dto,
      (user) => this.mapToDto(user),
      {
        where,
        relations: ['organization'],
      }
    )
  }

  // ============================================
  // Opción 3: Filtros complejos (OR, LIKE, ANY)
  // ============================================
  async paginateWithSearch(dto: FindUsersDto) {
    const { page = 1, limit = 10, search, role } = dto

    const queryBuilder = this.getRepo()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')

    // Búsqueda OR
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.names) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` }
      )
    }

    // Filtro en array
    if (role) {
      queryBuilder.andWhere(':role = ANY(user.roles)', { role })
    }

    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    return PaginatedResponseBuilder.create(data, total, page, limit)
  }

  // Helper privado para mapeo
  private mapToDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      isActive: user.status === UserStatus.ACTIVE,
      createdAt: user.createdAt.toISOString(),
      roles: user.roles,
      organizationName: user.organization?.name || '',
      imageUrl: user.image || null,
    }
  }
}
```

---

## 📊 Comparación de Métodos

| Método | Filtros | Mapeo | Uso |
|--------|---------|-------|-----|
| `paginate()` | ❌ No | ❌ No | Paginación básica sin personalizaciones |
| `paginateWithOptions()` | ✅ AND | ❌ No | Filtros simples sin mapeo |
| `paginateWithMapper()` | ✅ AND | ✅ Sí | Filtros simples + DTO |
| QueryBuilder manual | ✅ OR/ANY | ⚠️ Manual | Filtros complejos (reutiliza `PaginatedResponseBuilder`) |

---

## ✅ Best Practices

### 1. Elegir el método correcto

```typescript
// ✅ BIEN: Filtros simples
return super.paginateWithOptions(dto, {
  where: { status: UserStatus.ACTIVE }
})

// ❌ MAL: QueryBuilder para filtros simples (sobre-ingeniería)
const qb = this.getRepo().createQueryBuilder('user')
qb.where('user.status = :status', { status: UserStatus.ACTIVE })
// ...más código innecesario
```

### 2. Reutilizar el mapper

```typescript
// ✅ BIEN: Mapper reutilizable
private mapToDto(user: UserEntity): UserResponseDto {
  return { /* mapeo */ }
}

async paginateAsDto(dto) {
  return super.paginateWithMapper(dto, (u) => this.mapToDto(u))
}

// ❌ MAL: Duplicar lógica de mapeo
async paginateAsDto(dto) {
  const result = await super.paginateWithOptions(dto)
  return {
    ...result,
    data: result.data.map(u => ({ /* duplica mapeo */ }))
  }
}
```

### 3. Documentar el método

```typescript
/**
 * Pagina usuarios activos con sus organizaciones
 *
 * @param dto - Parámetros de paginación
 * @returns Usuarios activos paginados con organización cargada
 *
 * @example
 * ```typescript
 * const users = await usersRepo.paginateActive({ page: 1, limit: 10 })
 * ```
 */
async paginateActive(dto: PaginationDto) {
  return super.paginateWithOptions(dto, {
    where: { status: UserStatus.ACTIVE },
    relations: ['organization'],
  })
}
```

---

## 🎓 Lecciones Aprendidas

### ✅ Ventajas de este enfoque

1. **DRY (Don't Repeat Yourself):** Reutiliza lógica del padre
2. **Type-safe:** TypeScript valida tipos automáticamente
3. **Flexible:** Soporta filtros simples Y complejos
4. **Mantenible:** Cambios en el padre se propagan automáticamente
5. **Testeable:** Fácil de mockear y testear

### ⚠️ Cuándo NO usar estos métodos

- ❌ **Filtros muy complejos con múltiples joins:** Usa QueryBuilder directamente
- ❌ **Agregaciones (GROUP BY, COUNT, SUM):** QueryBuilder es más apropiado
- ❌ **Queries nativas SQL:** Usa `EntityManager.query()`

---

## 📚 Referencias

- [TypeORM FindOptions](https://typeorm.io/find-options)
- [TypeORM QueryBuilder](https://typeorm.io/select-query-builder)
- [BaseRepository Documentation](./base.repository.ts)

---

**Creado por:** Claude Sonnet 4.5
**Última actualización:** 2026-01-14
