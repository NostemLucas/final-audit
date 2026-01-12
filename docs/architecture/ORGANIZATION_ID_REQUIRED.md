# organizationId Ahora es Requerido en Users

## 📋 Resumen

Se ha actualizado el sistema para que **todos los usuarios deben pertenecer obligatoriamente a una organización**. Esto asegura que no haya usuarios "huérfanos" sin organización asignada.

## 🔄 Cambios Realizados

### 1. Entidad User (`user.entity.ts`)

**Antes:**

```typescript
@Column({ type: 'uuid', nullable: true })
organizationId: string | null

@ManyToOne(() => OrganizationEntity, {
  nullable: true,
})
organization: OrganizationEntity
```

**Después:**

```typescript
@Column({ type: 'uuid' })
organizationId: string

@ManyToOne(() => OrganizationEntity, {
  nullable: false,
})
organization: OrganizationEntity
```

### 2. DTOs

**CreateUserDto:**

```typescript
// Antes
@ApiPropertyOptional()
@IsOptional()
@IsUUID('4')
organizationId?: string

// Después
@ApiProperty({
  description: 'ID de la organización a la que pertenece el usuario (requerido)',
})
@IsUUID('4', { message: 'El ID de organización debe ser un UUID válido' })
organizationId: string
```

### 3. Fixtures de Tests

Todos los fixtures ahora incluyen `organizationId`:

```typescript
// user.fixtures.ts
export const TEST_USERS = {
  ADMIN: {
    // ...
    organizationId: 'org-1', // ✅ Requerido
  },
  INACTIVE: {
    // ...
    organizationId: 'org-1', // ✅ Antes era null
  }
}

// UserBuilder
private user: Partial<UserEntity> = {
  // ...
  organizationId: 'default-org-id', // ✅ Valor por defecto
}

// createTestUser
export function createTestUser(overrides?: Partial<UserEntity>): UserEntity {
  return {
    // ...
    organizationId: 'test-org-id', // ✅ Requerido
  }
}
```

### 4. Tests Actualizados

Todos los tests que crean usuarios ahora incluyen `organizationId`:

```typescript
// users.service.spec.ts
const dto: CreateUserDto = {
  names: 'Nuevo',
  lastNames: 'Usuario',
  email: 'nuevo@test.com',
  username: 'nuevousuario',
  ci: '55555555',
  password: 'NewPass123!',
  organizationId: 'org-1', // ✅ Requerido
  roles: [Role.CLIENTE],
  status: UserStatus.ACTIVE,
}
```

### 5. Migración de Base de Datos

**Archivo:** `src/@core/database/migrations/MakeOrganizationIdRequired.ts`

La migración:

1. ✅ Verifica que exista al menos una organización
2. ✅ Asigna la primera organización a usuarios con `organizationId = NULL`
3. ✅ Hace la columna `NOT NULL`
4. ✅ Incluye `down()` para revertir si es necesario

## 🚀 Cómo Aplicar los Cambios

### Paso 1: Verificar que tienes organizaciones

```bash
# Conectar a tu base de datos y verificar
psql -U user -d database
SELECT COUNT(*) FROM organizations WHERE "deletedAt" IS NULL;
```

**IMPORTANTE:** Debes tener al menos 1 organización creada antes de ejecutar la migración.

### Paso 2: Ejecutar la Migración

```bash
# Ejecutar migración
npm run migration:run
```

La migración automáticamente:

- Asignará la primera organización a usuarios sin organizationId (si existen)
- Hará la columna NOT NULL

### Paso 3: Verificar

```bash
# Verificar que todos los usuarios tienen organizationId
psql -U user -d database
SELECT COUNT(*) FROM users WHERE "organizationId" IS NULL;
-- Debe retornar 0
```

## 📝 Validaciones de API

Ahora las requests API **deben** incluir `organizationId`:

### ✅ Request Válido

```json
POST /users
{
  "names": "Juan",
  "lastNames": "Pérez",
  "email": "juan@test.com",
  "username": "juanperez",
  "ci": "12345678",
  "password": "SecurePass123!",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "roles": ["auditor"],
  "status": "active"
}
```

### ❌ Request Inválido (sin organizationId)

```json
POST /users
{
  "names": "Juan",
  "lastNames": "Pérez",
  "email": "juan@test.com",
  "username": "juanperez",
  "ci": "12345678",
  "password": "SecurePass123!",
  "roles": ["auditor"]
}

// Response: 400 Bad Request
{
  "message": ["El ID de organización debe ser un UUID válido"],
  "error": "Bad Request",
  "statusCode": 400
}
```

## 🧪 Tests

Todos los tests (26/26) pasaron después de los cambios:

```bash
npm test -- users.service.spec.ts

Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

## 🔄 Revertir Cambios (si es necesario)

Si por alguna razón necesitas revertir:

```bash
# Revertir la migración
npm run migration:revert

# Esto hace organizationId opcional nuevamente
```

Luego tendrías que revertir manualmente:

1. Cambiar `user.entity.ts` a `nullable: true`
2. Cambiar `create-user.dto.ts` a `@IsOptional()`
3. Actualizar fixtures y tests

## ⚠️ Consideraciones Importantes

### 1. Usuarios Existentes

Si tienes usuarios en tu base de datos **sin** `organizationId`:

- La migración los asignará automáticamente a la primera organización disponible
- Revisa y actualiza manualmente si es necesario

### 2. Seeders

Actualiza tus seeders para incluir `organizationId`:

```typescript
// seeders/user.seed.ts
await userRepository.save({
  names: 'Admin',
  lastNames: 'User',
  email: 'admin@test.com',
  username: 'admin',
  ci: '12345678',
  password: hashedPassword,
  organizationId: firstOrg.id, // ✅ Requerido
  roles: [Role.ADMIN],
  status: UserStatus.ACTIVE,
})
```

### 3. Flujo de Registro

Asegúrate de que tu flujo de registro de usuarios:

1. Primero crea o selecciona una organización
2. Luego crea el usuario con el `organizationId`

O en algunos casos:

1. El admin selecciona la organización al crear un usuario
2. El usuario se crea automáticamente en la organización del admin

## 📊 Impacto

| Aspecto              | Antes            | Después              |
| -------------------- | ---------------- | -------------------- |
| **organizationId**   | Opcional         | **Requerido**        |
| **Usuarios sin org** | Permitido        | **NO permitido**     |
| **Validación API**   | No valida        | **Valida UUID**      |
| **Tests**            | 26/26 pasando    | **26/26 pasando** ✅ |
| **Tipo TypeScript**  | `string \| null` | `string`             |

## ✅ Checklist de Implementación

- [x] Actualizar entidad `user.entity.ts`
- [x] Actualizar DTO `create-user.dto.ts`
- [x] Actualizar fixtures `user.fixtures.ts`
- [x] Actualizar tests `users.service.spec.ts`
- [x] Crear migración `MakeOrganizationIdRequired.ts`
- [ ] Ejecutar migración en dev/staging
- [ ] Verificar usuarios existentes
- [ ] Actualizar seeders (si aplica)
- [ ] Actualizar documentación de API
- [ ] Ejecutar migración en producción

## 🎯 Próximos Pasos

1. **Revisar usuarios existentes** en la base de datos
2. **Ejecutar la migración** en desarrollo
3. **Verificar** que todos los usuarios tienen organizationId
4. **Actualizar seeders** si usas seeding
5. **Ejecutar migración** en staging
6. **Ejecutar migración** en producción (después de validar en staging)

## 📚 Referencias

- Entity: `src/modules/users/entities/user.entity.ts:54-61`
- DTO: `src/modules/users/dtos/create-user.dto.ts:119-124`
- Fixtures: `src/modules/users/__tests__/fixtures/user.fixtures.ts:84,105,195`
- Migración: `src/@core/database/migrations/MakeOrganizationIdRequired.ts`
