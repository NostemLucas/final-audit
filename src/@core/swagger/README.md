# Sistema de Decoradores Swagger

Sistema de decoradores personalizados para simplificar la documentación de endpoints con Swagger/OpenAPI.

## 🎯 Problema

Documentar cada endpoint con `@ApiResponse` es **muy repetitivo**:

```typescript
@Post()
@ApiResponse({ status: 201, description: 'Usuario creado' })
@ApiResponse({ status: 400, description: 'Datos inválidos' })
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Sin permisos' })
@ApiResponse({ status: 409, description: 'Ya existe' })
@ApiResponse({ status: 500, description: 'Error interno' })
async create(@Body() dto: CreateUserDto) {
  // ...
}
```

**Problemas:**
- ❌ 6+ líneas de decoradores para cada endpoint
- ❌ Fácil olvidar respuestas importantes
- ❌ Inconsistencia entre endpoints
- ❌ Difícil de mantener

---

## ✅ Solución: Decoradores Compuestos

```typescript
@Post()
@ApiCreateResponses(UserDto, 'Usuario con ese email ya existe')
async create(@Body() dto: CreateUserDto) {
  // ...
}
```

**Ventajas:**
- ✅ 1 línea en lugar de 6+
- ✅ Consistencia automática
- ✅ Type-safe con DTOs
- ✅ Fácil de mantener

---

## 📦 Decoradores Disponibles

### 1. Decoradores Individuales

#### `@ApiStandardResponses()`

Aplica respuestas estándar comunes (400, 401, 403, 500):

```typescript
@Get()
@ApiStandardResponses()
async findAll() {
  // Documenta automáticamente: 400, 401, 403, 500
}

// Excluir respuestas específicas
@Get('public')
@ApiStandardResponses({ exclude: [401, 403] })
async publicEndpoint() {
  // Documenta solo: 400, 500
}
```

#### `@ApiOkResponse(type, description?, isArray?)`

Respuesta exitosa para GET (200):

```typescript
@Get()
@ApiOkResponse(UserDto)
async findOne() {
  // 200: Retorna UserDto
}

@Get()
@ApiOkResponse(UserDto, 'Lista de usuarios', true)
async findAll() {
  // 200: Retorna UserDto[]
}
```

#### `@ApiCreatedResponse(type, description?)`

Respuesta exitosa para POST (201):

```typescript
@Post()
@ApiCreatedResponse(UserDto)
async create() {
  // 201: Usuario creado exitosamente
}

@Post()
@ApiCreatedResponse(UserDto, 'Usuario creado y email enviado')
async create() {
  // 201: Con descripción personalizada
}
```

#### `@ApiUpdatedResponse(type, description?)`

Respuesta exitosa para PUT/PATCH (200):

```typescript
@Patch(':id')
@ApiUpdatedResponse(UserDto)
async update() {
  // 200: Usuario actualizado exitosamente
}
```

#### `@ApiDeletedResponse(description?, noContent?)`

Respuesta exitosa para DELETE (200 o 204):

```typescript
@Delete(':id')
@ApiDeletedResponse()
async remove() {
  // 200: Usuario eliminado exitosamente
}

@Delete(':id')
@ApiDeletedResponse('Usuario eliminado', true)
async remove() {
  // 204: Sin contenido
}
```

#### `@ApiConflictResponse(description)`

Respuesta de conflicto (409):

```typescript
@Post()
@ApiConflictResponse('Ya existe un usuario con ese email')
async create() {
  // 409: Conflicto
}
```

#### `@ApiNotFoundResponse(description?)`

Respuesta de no encontrado (404):

```typescript
@Get(':id')
@ApiNotFoundResponse('Usuario no encontrado')
async findOne() {
  // 404: No encontrado
}
```

---

### 2. Decoradores CRUD Compuestos

Estos combinan múltiples respuestas para operaciones CRUD completas.

#### `@ApiCreateResponses(type, conflictDescription?)`

Para endpoints **POST** (crear recursos):

```typescript
@Post()
@ApiCreateResponses(UserDto, 'Usuario con ese email ya existe')
async create(@Body() dto: CreateUserDto) {
  // Documenta automáticamente:
  // ✅ 201: Usuario creado
  // ✅ 400: Validación
  // ✅ 401: No autenticado
  // ✅ 403: Sin permisos
  // ✅ 409: Conflicto
  // ✅ 500: Error interno
}
```

#### `@ApiReadResponses(type, isArray?)`

Para endpoints **GET** (leer recursos):

```typescript
@Get()
@ApiReadResponses(UserDto, true)
async findAll() {
  // Documenta automáticamente:
  // ✅ 200: Lista de usuarios
  // ✅ 400: Validación (filtros)
  // ✅ 401: No autenticado
  // ✅ 403: Sin permisos
  // ✅ 500: Error interno
}

@Get(':id')
@ApiReadResponses(UserDto, false)
async findOne() {
  // Documenta automáticamente:
  // ✅ 200: Usuario individual
  // ✅ 400, 401, 403, 500
}
```

#### `@ApiUpdateResponses(type, includeConflict?)`

Para endpoints **PUT/PATCH** (actualizar recursos):

```typescript
@Patch(':id')
@ApiUpdateResponses(UserDto)
async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  // Documenta automáticamente:
  // ✅ 200: Usuario actualizado
  // ✅ 400: Validación
  // ✅ 401: No autenticado
  // ✅ 403: Sin permisos
  // ✅ 404: No encontrado
  // ✅ 500: Error interno
}

@Patch(':id')
@ApiUpdateResponses(UserDto, true)
async update() {
  // Incluye también:
  // ✅ 409: Conflicto (si se actualiza a un valor que ya existe)
}
```

#### `@ApiDeleteResponses(noContent?)`

Para endpoints **DELETE** (eliminar recursos):

```typescript
@Delete(':id')
@ApiDeleteResponses()
async remove(@Param('id') id: string) {
  // Documenta automáticamente:
  // ✅ 200: Usuario eliminado
  // ✅ 401: No autenticado
  // ✅ 403: Sin permisos
  // ✅ 404: No encontrado
  // ✅ 500: Error interno
}

@Delete(':id')
@ApiDeleteResponses(true)
async remove() {
  // Usa 204 en lugar de 200
}
```

---

## 📝 Ejemplos Completos

### Ejemplo 1: CRUD Completo

```typescript
import {
  ApiCreateResponses,
  ApiReadResponses,
  ApiUpdateResponses,
  ApiDeleteResponses,
} from '@core/swagger'

@Controller('users')
@ApiTags('users')
export class UsersController {
  // CREATE
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear usuario' })
  @ApiCreateResponses(UserDto, 'Usuario con ese email ya existe')
  async create(@Body() dto: CreateUserDto) {
    return await this.service.create(dto)
  }

  // READ ALL
  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiReadResponses(UserDto, true)
  async findAll() {
    return await this.service.findAll()
  }

  // READ ONE
  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiReadResponses(UserDto, false)
  @ApiNotFoundResponse('Usuario no encontrado')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id)
  }

  // UPDATE
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiUpdateResponses(UserDto, true)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.service.update(id, dto)
  }

  // DELETE
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiDeleteResponses()
  async remove(@Param('id') id: string) {
    return await this.service.remove(id)
  }
}
```

### Ejemplo 2: Endpoint Público

```typescript
@Get('public/stats')
@ApiOperation({ summary: 'Estadísticas públicas' })
@ApiStandardResponses({ exclude: [401, 403] }) // Sin autenticación
@ApiOkResponse(StatsDto)
async getPublicStats() {
  return await this.service.getStats()
}
```

### Ejemplo 3: Personalización Completa

```typescript
@Post('assign-role')
@ApiOperation({ summary: 'Asignar rol a usuario' })
@ApiOkResponse(UserDto, 'Rol asignado exitosamente')
@ApiNotFoundResponse('Usuario no encontrado')
@ApiConflictResponse('El usuario ya tiene este rol')
@ApiStandardResponses()
async assignRole(@Body() dto: AssignRoleDto) {
  return await this.service.assignRole(dto)
}
```

---

## 🎨 Comparación: Antes vs Después

### ❌ ANTES (Repetitivo)

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Crear usuario' })
@ApiResponse({
  status: 201,
  description: 'Usuario creado exitosamente',
  type: UserDto
})
@ApiResponse({
  status: 400,
  description: 'Datos inválidos'
})
@ApiResponse({
  status: 401,
  description: 'No autenticado'
})
@ApiResponse({
  status: 403,
  description: 'Sin permisos'
})
@ApiResponse({
  status: 409,
  description: 'Usuario ya existe'
})
@ApiResponse({
  status: 500,
  description: 'Error interno'
})
async create(@Body() dto: CreateUserDto) {
  return await this.service.create(dto)
}
```

**Líneas de código:** 25 líneas

### ✅ DESPUÉS (Simple)

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Crear usuario' })
@ApiCreateResponses(UserDto, 'Usuario ya existe')
async create(@Body() dto: CreateUserDto) {
  return await this.service.create(dto)
}
```

**Líneas de código:** 6 líneas (reducción del 76%)

---

## 🔧 Personalización

### Combinar Decoradores

Puedes combinar decoradores para casos específicos:

```typescript
@Post('register')
@ApiCreatedResponse(UserDto, 'Usuario registrado y email enviado')
@ApiConflictResponse('Email ya registrado')
@ApiBadRequestResponse('Contraseña muy débil')
@ApiStandardResponses({ exclude: [401, 403] }) // Público
async register(@Body() dto: RegisterDto) {
  return await this.service.register(dto)
}
```

### Agregar Respuestas Adicionales

```typescript
@Post()
@ApiCreateResponses(UserDto)
@ApiResponse({ status: 422, description: 'Organización inactiva' })
async create(@Body() dto: CreateUserDto) {
  // ...
}
```

---

## 📊 Estructura de Respuestas

Todas las respuestas de error siguen este formato estándar:

```json
{
  "statusCode": 400,
  "message": "El campo nombres debe tener al menos 2 caracteres",
  "error": "Bad Request"
}
```

O para múltiples errores de validación:

```json
{
  "statusCode": 400,
  "message": [
    "El campo nombres debe tener al menos 2 caracteres",
    "El campo correo electrónico debe ser una dirección de correo electrónico válida"
  ],
  "error": "Bad Request"
}
```

---

## 💡 Mejores Prácticas

1. **Usa decoradores CRUD** para endpoints estándar
2. **Usa decoradores individuales** para casos especiales
3. **Siempre incluye `@ApiOperation`** con summary
4. **Personaliza mensajes de conflicto** para claridad
5. **Excluye respuestas** que no apliquen (ej: 401 en endpoints públicos)

---

## 🚀 Próximos Pasos

1. Refactorizar controllers existentes para usar estos decoradores
2. Crear decoradores adicionales según necesidades específicas
3. Mantener consistencia en todo el proyecto

---

## 📚 Referencias

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
