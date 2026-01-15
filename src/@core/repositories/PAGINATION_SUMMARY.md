# 🎯 Resumen: Solución de Paginación Mejorada

## Tu Pregunta Original

> "¿Qué pasaría si en lugar de crear un método como en UserRepository, al `paginate()` le paso dos params más: un tipo `T` para mapear y un `FindManyOptions` construido en el repositorio usando `getRepo()`, para reutilizar la lógica del padre sin duplicar código?"

---

## ✅ Solución Implementada

He modificado `BaseRepository` para agregar **dos métodos protegidos** que resuelven exactamente tu problema:

```typescript
// BaseRepository.ts

// 1️⃣ Paginación con filtros personalizados
protected async paginateWithOptions(
  query: PaginationDto,
  options?: FindManyOptions<T>,
): Promise<PaginatedResponse<T>>

// 2️⃣ Paginación con filtros Y mapeo a DTO
protected async paginateWithMapper<R>(
  query: PaginationDto,
  mapper: (entity: T) => R,
  options?: FindManyOptions<T>,
): Promise<PaginatedResponse<R>>
```

---

## 🔄 Antes vs Después

### ❌ ANTES: Código duplicado

```typescript
// UserRepository.ts
async paginateUsers(dto: FindUsersDto) {
  const { page = 1, limit = 10, status } = dto

  // ❌ Duplicar toda la lógica de paginación
  const skip = (page - 1) * limit

  const [data, total] = await this.getRepo().findAndCount({
    where: { status },
    relations: ['organization'],
    take: limit,
    skip,
  })

  // ❌ Duplicar PaginatedResponseBuilder
  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

### ✅ DESPUÉS: Reutiliza el padre

```typescript
// UserRepository.ts
async paginateUsers(dto: FindUsersDto) {
  // ✅ Reutiliza TODA la lógica del padre
  return super.paginateWithOptions(dto, {
    where: { status: dto.status },
    relations: ['organization'],
  })
}
```

---

## 📊 Comparación de Métodos

| Método | Acceso | Filtros | Mapeo | Uso |
|--------|--------|---------|-------|-----|
| `paginate(dto)` | Público | ❌ | ❌ | Paginación básica |
| `paginateWithOptions(dto, options)` | Protegido | ✅ AND | ❌ | Filtros simples |
| `paginateWithMapper<R>(dto, mapper, options)` | Protegido | ✅ AND | ✅ | Filtros + DTO |
| QueryBuilder manual | N/A | ✅ OR/ANY | Manual | Filtros complejos |

---

## 🚀 Casos de Uso

### Caso 1: Solo Filtros (sin mapeo)

```typescript
// UserRepository
async paginateActive(dto: PaginationDto) {
  return super.paginateWithOptions(dto, {
    where: { status: UserStatus.ACTIVE },
    relations: ['organization'],
  })
}
```

**Uso:**
```typescript
const users = await usersRepo.paginateActive({ page: 1, limit: 10 })
// Retorna: PaginatedResponse<UserEntity>
```

---

### Caso 2: Filtros + Mapeo a DTO

```typescript
// UserRepository
async paginateActiveAsDto(dto: PaginationDto) {
  return super.paginateWithMapper<UserResponseDto>(
    dto,
    (user) => this.mapToDto(user), // ← Función de mapeo
    {
      where: { status: UserStatus.ACTIVE },
      relations: ['organization'],
    }
  )
}

private mapToDto(user: UserEntity): UserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    // ...
  }
}
```

**Uso:**
```typescript
const users = await usersRepo.paginateActiveAsDto({ page: 1, limit: 10 })
// Retorna: PaginatedResponse<UserResponseDto> ← Datos mapeados
```

---

### Caso 3: Filtros Dinámicos

```typescript
// UserRepository
async paginateWithDynamicFilters(dto: FindUsersDto) {
  // Construir filtros dinámicamente
  const where: FindOptionsWhere<UserEntity> = {}

  if (dto.status) where.status = dto.status
  if (dto.organizationId) where.organizationId = dto.organizationId

  // ✅ Reutilizar padre
  return super.paginateWithOptions(dto, {
    where,
    relations: ['organization'],
  })
}
```

---

### Caso 4: Filtros Complejos (OR, LIKE, ANY)

Para filtros que `FindManyOptions` no soporta, usa QueryBuilder directamente:

```typescript
// UserRepository
async paginateWithSearch(dto: FindUsersDto) {
  const { page = 1, limit = 10, search } = dto

  const queryBuilder = this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.organization', 'organization')

  // Filtro OR (no soportado por FindManyOptions)
  if (search) {
    queryBuilder.andWhere(
      '(LOWER(user.names) LIKE :search OR LOWER(user.email) LIKE :search)',
      { search: `%${search.toLowerCase()}%` }
    )
  }

  const skip = (page - 1) * limit
  queryBuilder.skip(skip).take(limit)

  const [data, total] = await queryBuilder.getManyAndCount()

  // ✅ Reutiliza el builder de respuesta
  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

---

## 🎓 Cuándo Usar Cada Método

### ✅ `paginateWithOptions()` - Filtros simples

**Usar cuando:**
- Filtros AND (ej: `{ status: 'active', verified: true }`)
- Necesitas relaciones (`relations: ['organization']`)
- No necesitas mapear a DTO

**Ejemplo:**
```typescript
return super.paginateWithOptions(dto, {
  where: { status: UserStatus.ACTIVE, emailVerified: true },
  relations: ['organization'],
  select: ['id', 'email', 'names'],
})
```

---

### ✅ `paginateWithMapper<R>()` - Filtros + Mapeo

**Usar cuando:**
- Filtros AND
- Necesitas convertir a DTO de respuesta
- Quieres ocultar campos sensibles (password, etc.)

**Ejemplo:**
```typescript
return super.paginateWithMapper<UserResponseDto>(
  dto,
  (user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  }),
  { where: { status: UserStatus.ACTIVE } }
)
```

---

### ✅ QueryBuilder - Filtros complejos

**Usar cuando:**
- Filtros OR: `(name LIKE 'john' OR email LIKE 'john')`
- Filtros en arrays: `role = ANY(user.roles)`
- Joins complejos
- Agregaciones (GROUP BY, COUNT)

**Ejemplo:**
```typescript
const qb = this.getRepo().createQueryBuilder('user')
qb.andWhere('(user.name LIKE :search OR user.email LIKE :search)')
// ... más filtros complejos
const [data, total] = await qb.getManyAndCount()
return PaginatedResponseBuilder.create(data, total, page, limit)
```

---

## ⚡ Ventajas de esta Solución

| Ventaja | Descripción |
|---------|-------------|
| **DRY** | No duplicas lógica de paginación |
| **Type-safe** | TypeScript valida tipos automáticamente |
| **Flexible** | Soporta filtros simples Y complejos |
| **Retrocompatible** | `paginate()` básico sigue funcionando |
| **Mantenible** | Cambios en el padre se propagan a todos los hijos |
| **Testeable** | Fácil de mockear y testear |

---

## 📁 Archivos Modificados

```
src/@core/repositories/
├── base.repository.ts           ← ✅ Agregados paginateWithOptions() y paginateWithMapper()
├── PAGINATION_GUIDE.md          ← ✅ Guía completa de uso
└── PAGINATION_SUMMARY.md        ← ✅ Este archivo

src/modules/users/repositories/
├── users.repository.ts          ← ✅ Agregados paginateSimple() y paginateSimpleAsDto()
└── users-repository.interface.ts ← ✅ Actualizada interfaz
```

---

## 🔍 Ejemplo Real: UserRepository

```typescript
@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  // ============================================
  // Método 1: Filtros simples (reutiliza padre)
  // ============================================
  async paginateSimple(dto: FindUsersDto, where?: FindOptionsWhere<UserEntity>) {
    return super.paginateWithOptions(dto, {
      where,
      relations: ['organization'],
    })
  }

  // ============================================
  // Método 2: Filtros + DTO (reutiliza padre)
  // ============================================
  async paginateSimpleAsDto(dto: FindUsersDto, where?: FindOptionsWhere<UserEntity>) {
    return super.paginateWithMapper<UserResponseDto>(
      dto,
      (user) => this.mapToDto(user),
      { where, relations: ['organization'] }
    )
  }

  // ============================================
  // Método 3: Filtros complejos (QueryBuilder)
  // ============================================
  async paginateWithSearch(dto: FindUsersDto) {
    const qb = this.getRepo()
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')

    // Búsqueda OR
    if (dto.search) {
      qb.andWhere('(LOWER(user.names) LIKE :search OR LOWER(user.email) LIKE :search)')
    }

    // Filtro ANY
    if (dto.role) {
      qb.andWhere(':role = ANY(user.roles)', { role: dto.role })
    }

    const skip = (dto.page - 1) * dto.limit
    qb.skip(skip).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()

    // ✅ Reutiliza builder
    return PaginatedResponseBuilder.create(data, total, dto.page, dto.limit)
  }

  // Helper privado
  private mapToDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      // ...
    }
  }
}
```

---

## 🎯 Resultado Final

**Tu pregunta original:**
> ¿Pasar `FindManyOptions` y un tipo genérico `T` para mapear?

**Respuesta:** ✅ **SÍ, exactamente eso.**

He agregado dos métodos protegidos:
1. `paginateWithOptions()` → Acepta `FindManyOptions`
2. `paginateWithMapper<R>()` → Acepta `FindManyOptions` + función de mapeo `(T) => R`

Ambos métodos:
- ✅ Reutilizan TODA la lógica del padre
- ✅ No duplican código
- ✅ Son type-safe
- ✅ Soportan `all=true` automáticamente
- ✅ Usan `PaginatedResponseBuilder`

---

## 📚 Próximos Pasos

1. ✅ Lee `PAGINATION_GUIDE.md` para ejemplos completos
2. ✅ Actualiza tus repositorios existentes para usar estos métodos
3. ✅ Elimina código duplicado de paginación
4. ✅ Disfruta de código más limpio y mantenible

---

**¡Listo para usar!** 🚀
