# Sistema de Paginación Profesional

Este documento describe la implementación completa del sistema de paginación estandarizado con soporte para filtros personalizados.

## 📋 Componentes del Sistema

### 1. DTOs Base (`@core/dtos`)

#### `PaginationDto`
DTO base que proporciona parámetros estándar de paginación:

```typescript
export class PaginationDto {
  page?: number = 1          // Página actual (default: 1)
  limit?: number = 10        // Registros por página (default: 10, max: 100)
  all?: boolean = false      // Devolver todos los registros
  sortBy?: string            // Campo para ordenar
  sortOrder?: 'ASC' | 'DESC' // Orden ascendente/descendente
}
```

**Características:**
- Validación automática con `class-validator`
- Transformación de tipos con `class-transformer`
- `all=true` permite devolver todos los registros sin paginación

#### `PaginatedResponse<T>`
Estructura estándar de respuesta paginada:

```typescript
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number         // Total de registros
    page: number          // Página actual
    limit: number         // Registros por página
    totalPages: number    // Total de páginas
    hasNextPage: boolean  // ¿Hay página siguiente?
    hasPrevPage: boolean  // ¿Hay página anterior?
  }
}
```

#### `PaginatedResponseBuilder`
Helper para crear respuestas paginadas:

```typescript
// Respuesta paginada normal
PaginatedResponseBuilder.create(data, total, page, limit)

// Todos los registros (all=true)
PaginatedResponseBuilder.createAll(data)

// Respuesta vacía
PaginatedResponseBuilder.createEmpty<T>()
```

### 2. BaseRepository

El `BaseRepository` incluye el método genérico `paginate()`:

```typescript
async paginate(query: PaginationDto): Promise<PaginatedResponse<T>> {
  const { page = 1, limit = 10, all = false, sortBy, sortOrder } = query

  if (all) {
    const allRecords = await this.findAll({
      order: sortBy ? { [sortBy]: sortOrder || 'DESC' } : undefined,
    })
    return PaginatedResponseBuilder.createAll(allRecords)
  }

  const skip = (page - 1) * limit
  const [data, total] = await this.getRepo().findAndCount({
    take: limit,
    skip,
    order: sortBy ? { [sortBy]: sortOrder || 'DESC' } : undefined,
  })

  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

**Nota:** Este método es útil para paginación simple. Para filtros personalizados, se debe extender en el repositorio específico.

## 🎯 Ejemplo Completo: Organizations Module

### Paso 1: Crear DTO Extendido

Crea un DTO que extienda `PaginationDto` y agregue filtros específicos:

```typescript
// src/modules/organizations/dtos/find-organizations.dto.ts
import { PaginationDto } from '@core/dtos'
import { IsOptional, IsString, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class FindOrganizationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string  // Búsqueda de texto libre

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean  // Filtrar por estado

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasLogo?: boolean  // Filtrar por logo
}
```

### Paso 2: Extender Repository Interface

Define la interfaz para el método de búsqueda personalizado:

```typescript
// src/modules/organizations/repositories/organization-repository.interface.ts
export interface OrganizationFilters {
  search?: string
  isActive?: boolean
  hasLogo?: boolean
}

export interface IOrganizationRepository extends IBaseRepository<OrganizationEntity> {
  // ... otros métodos

  findWithFilters(
    filters: OrganizationFilters,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<[OrganizationEntity[], number]>
}
```

### Paso 3: Implementar en Repository

Implementa la búsqueda personalizada usando QueryBuilder:

```typescript
// src/modules/organizations/repositories/organization.repository.ts
async findWithFilters(
  filters: OrganizationFilters,
  page?: number,
  limit?: number,
  sortBy: string = 'createdAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC',
): Promise<[OrganizationEntity[], number]> {
  const queryBuilder = this.getRepo()
    .createQueryBuilder('org')
    .leftJoinAndSelect('org.users', 'users')

  // Filtro de búsqueda de texto (OR conditions)
  if (filters.search) {
    const searchTerm = `%${filters.search}%`
    queryBuilder.andWhere(
      '(org.name ILIKE :search OR org.nit ILIKE :search OR org.description ILIKE :search OR org.email ILIKE :search)',
      { search: searchTerm },
    )
  }

  // Filtro por estado activo
  if (filters.isActive !== undefined) {
    queryBuilder.andWhere('org.isActive = :isActive', {
      isActive: filters.isActive,
    })
  }

  // Filtro por logo
  if (filters.hasLogo !== undefined) {
    if (filters.hasLogo) {
      queryBuilder.andWhere('org.logoUrl IS NOT NULL')
    } else {
      queryBuilder.andWhere('org.logoUrl IS NULL')
    }
  }

  // Ordenamiento
  queryBuilder.orderBy(`org.${sortBy}`, sortOrder)

  // Paginación (si se proporciona)
  if (page !== undefined && limit !== undefined) {
    const skip = (page - 1) * limit
    queryBuilder.skip(skip).take(limit)
  }

  return await queryBuilder.getManyAndCount()
}
```

### Paso 4: Implementar en Service

Usa el repositorio para manejar la lógica de paginación:

```typescript
// src/modules/organizations/services/organizations.service.ts
async findWithFilters(
  query: FindOrganizationsDto,
): Promise<PaginatedResponse<OrganizationEntity>> {
  const {
    page = 1,
    limit = 10,
    all = false,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    search,
    isActive,
    hasLogo,
  } = query

  const filters = { search, isActive, hasLogo }

  // Si all=true, devolver todos los registros
  if (all) {
    const [data] = await this.organizationRepository.findWithFilters(
      filters,
      undefined,
      undefined,
      sortBy,
      sortOrder,
    )
    return PaginatedResponseBuilder.createAll(data)
  }

  // Paginación normal
  const [data, total] = await this.organizationRepository.findWithFilters(
    filters,
    page,
    limit,
    sortBy,
    sortOrder,
  )

  return PaginatedResponseBuilder.create(data, total, page, limit)
}
```

### Paso 5: Exponer en Controller

Define el endpoint con documentación completa:

```typescript
// src/modules/organizations/controllers/organizations.controller.ts
@Get()
@ApiOperation({
  summary: 'Obtener organizaciones con paginación y filtros',
  description: 'Retorna organizaciones con soporte para paginación, búsqueda y filtros',
})
@ApiQuery({ name: 'page', required: false, description: 'Número de página', example: 1 })
@ApiQuery({ name: 'limit', required: false, description: 'Registros por página', example: 10 })
@ApiQuery({ name: 'all', required: false, description: 'Devolver todos los registros', example: false })
@ApiQuery({ name: 'search', required: false, description: 'Búsqueda de texto', example: 'coca' })
@ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por estado', example: true })
@ApiQuery({ name: 'hasLogo', required: false, description: 'Filtrar por logo', example: true })
async findAll(@Query() query: FindOrganizationsDto) {
  return await this.organizationsService.findWithFilters(query)
}
```

## 📡 Ejemplos de Uso

### Paginación básica
```bash
GET /organizations?page=1&limit=10
```

Respuesta:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Todos los registros
```bash
GET /organizations?all=true
```

Respuesta:
```json
{
  "data": [...100 organizations],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 100,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Búsqueda con filtros
```bash
GET /organizations?search=coca&isActive=true&hasLogo=true&page=1&limit=20
```

### Ordenamiento personalizado
```bash
GET /organizations?sortBy=name&sortOrder=ASC&limit=50
```

## 🎨 Patrón de Implementación

Para agregar paginación a cualquier módulo:

1. **DTO**: Extiende `PaginationDto` con filtros específicos
2. **Repository Interface**: Define método `findWithFilters()` con tipo de filtros
3. **Repository**: Implementa con QueryBuilder para queries complejas
4. **Service**: Maneja lógica de `all=true` vs paginación normal
5. **Controller**: Expone endpoint con `@Query()` decorator

## ✅ Ventajas

- **Consistencia**: Misma estructura de respuesta en toda la API
- **Flexibilidad**: Soporte para `all=true` sin cambiar la estructura
- **Extensibilidad**: Fácil agregar filtros específicos por módulo
- **Documentación**: Swagger genera docs automáticamente
- **Type Safety**: TypeScript garantiza tipos correctos

## 📝 Notas Importantes

1. **BaseRepository.paginate()** es útil solo para paginación simple sin filtros
2. Para filtros complejos, implementa `findWithFilters()` en el repository específico
3. Usa QueryBuilder para búsquedas con OR/AND múltiples
4. El parámetro `all=true` mantiene la misma estructura de respuesta
5. Los metadatos se calculan automáticamente con `PaginatedResponseBuilder`
