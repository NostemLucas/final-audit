# Estrategia de Paginación: ¿Cuál implementar?

## Tu Caso Específico

Tu `UserRepository` necesita:

1. ✅ **Búsqueda OR** en múltiples campos: `(names OR lastNames OR email OR username OR ci)`
2. ✅ **Filtro en array** (`role`): Los roles son `simple-array`, TypeORM básico no lo maneja bien
3. ✅ **Filtros simples**: `status`, `organizationId`, `onlyActive`
4. ✅ **Relaciones**: Necesitas `organization` cargada
5. ✅ **Mapeo a DTO**: Necesitas `UserResponseDto` en la respuesta

---

## Comparación de Enfoques

### ❌ Opción 1: Modificar BaseRepository para aceptar `options`

```typescript
// En BaseRepository
async paginate(
  query: PaginationDto,
  options?: FindManyOptions<T>
): Promise<PaginatedResponse<T>> {
  // ...mezclar options con findAndCount
}

// En UserRepository
async paginateUsers(dto: FindUsersDto) {
  return super.paginate(dto, {
    where: { status: dto.status }, // ❌ No funciona con OR
    relations: ['organization']
  })
}
```

**Por qué NO usar esto:**
- ❌ `FindOptionsWhere` no soporta condiciones OR complejas
- ❌ Filtrar en `simple-array` requiere SQL custom (`ANY(roles)`)
- ❌ La búsqueda `OR` necesitaría múltiples objetos `where: [...]`, muy verboso
- ❌ No es flexible para casos complejos

**Cuándo SÍ usar:**
- ✅ Filtros simples AND (ej: `where: { status, organizationId }`)
- ✅ Sin búsqueda OR
- ✅ Sin filtros en arrays

---

### ❌ Opción 2: Sobrescribir `paginate()` completamente

```typescript
// En UserRepository
override async paginate(dto: FindUsersDto) {
  // ...QueryBuilder custom
}
```

**Por qué NO usar esto:**
- ❌ Pierdes acceso al `paginate()` básico del padre
- ❌ Si otro método necesita paginación simple, no puede usar `super.paginate()`
- ❌ Menos flexible (un solo método para todo)

**Cuándo SÍ usar:**
- ✅ Si **SIEMPRE** necesitas los mismos filtros complejos
- ✅ Si nunca usarás paginación simple

---

### ✅ **Opción 3: QueryBuilder + PaginatedResponseBuilder (IMPLEMENTADA)**

```typescript
// En UserRepository
async paginateWithFilters(dto: FindUsersDto) {
  const queryBuilder = this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.organization', 'organization')

  if (dto.search) {
    queryBuilder.andWhere('(LOWER(user.names) LIKE :search OR ...)')
  }

  if (dto.role) {
    queryBuilder.andWhere(':role = ANY(user.roles)', { role: dto.role })
  }

  // ...más filtros

  const [data, total] = await queryBuilder.getManyAndCount()

  // ✅ Reutiliza el builder del padre
  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

**Por qué SÍ usar esto:**
- ✅ **Máxima flexibilidad**: QueryBuilder maneja cualquier SQL complejo
- ✅ **OR conditions**: `andWhere('(field1 LIKE :x OR field2 LIKE :x)')`
- ✅ **Array filters**: `ANY(user.roles)`, `IN`, etc.
- ✅ **Reutiliza lógica**: Usa `PaginatedResponseBuilder` del padre
- ✅ **No contamina BaseRepository**: El padre sigue limpio y simple
- ✅ **Sigue disponible `super.paginate()`**: Para casos simples
- ✅ **Mapeo separado**: Método independiente para transformar a DTO

---

## Implementación Final (Tu Código)

### Método 1: `paginateWithFilters()`

```typescript
await usersRepository.paginateWithFilters(dto)
// Retorna: PaginatedResponse<UserEntity>
```

**Usa esto cuando:**
- Necesitas las entidades completas
- Vas a procesar los datos después
- No necesitas DTOs

### Método 2: `paginateAndMap()`

```typescript
await usersRepository.paginateAndMap(dto)
// Retorna: PaginatedResponse<UserResponseDto>
```

**Usa esto cuando:**
- Necesitas devolver DTOs directamente al cliente
- Quieres ocultar campos sensibles (password, etc.)
- Es el caso más común en controladores

### Método 3: `super.paginate()` (sigue disponible)

```typescript
await usersRepository.paginate({ page: 1, limit: 10 })
// Retorna: PaginatedResponse<UserEntity>
```

**Usa esto cuando:**
- Paginación simple sin filtros
- No necesitas relaciones
- Caso básico

---

## Ejemplo de Uso

### En tu Use Case

```typescript
@Injectable()
export class FindAllUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(dto: FindUsersDto) {
    // ✅ RECOMENDADO: Paginación con filtros + mapeo a DTO
    return await this.usersRepository.paginateAndMap(dto)
  }
}
```

### En tu Controller

```typescript
@Get()
async findAll(@Query() dto: FindUsersDto) {
  return await this.findAllUsersUseCase.execute(dto)
}
```

### Respuesta

```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "Juan Pérez",
      "email": "juan@example.com",
      "username": "juanp",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "roles": ["admin", "auditor"],
      "organizationName": "Acme Corp",
      "imageUrl": "uploads/users/profile.jpg"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "lastPage": 5,
    "limit": 10
  }
}
```

---

## Resumen

| Criterio | Modificar Base | Sobrescribir | QueryBuilder + Builder |
|----------|---------------|--------------|------------------------|
| Filtros OR complejos | ❌ | ✅ | ✅ |
| Filtros en arrays | ❌ | ✅ | ✅ |
| No contamina BaseRepository | ✅ | ✅ | ✅ |
| Reutiliza lógica del padre | ✅ | ❌ | ✅ (builder) |
| Flexibilidad | ⚠️ Baja | ⚠️ Media | ✅ Alta |
| Mantiene `super.paginate()` | ✅ | ❌ | ✅ |

**🏆 Ganador para tu caso: QueryBuilder + PaginatedResponseBuilder**

---

## Principios Aplicados

1. **DRY (Don't Repeat Yourself)**: Reutiliza `PaginatedResponseBuilder`
2. **SRP (Single Responsibility)**:
   - `paginateWithFilters()` → Paginación con filtros
   - `paginateAndMap()` → Transformación a DTO
   - `mapToResponseDto()` → Mapeo de entidad
3. **Open/Closed**: Extiende sin modificar el padre
4. **CLS Integration**: Usa `this.getRepo()` para respetar transacciones
