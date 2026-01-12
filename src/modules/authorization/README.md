# Authorization Module - Casbin RBAC

Módulo de autorización basado en **Casbin** para control de acceso RBAC (Role-Based Access Control).

## Características

- ✅ **RBAC basado en roles** del sistema (admin, gerente, auditor, cliente)
- ✅ **Permisos almacenados en BD** (tabla `casbin_rule`)
- ✅ **Verificación automática** con decorator `@RequirePermission()`
- ✅ **Soporte para parámetros dinámicos** en rutas (`:id`, `:slug`, etc.)
- ✅ **Dos tipos de permisos**:
  - **Frontend**: Rutas de la aplicación web (ej: `/admin/users`)
  - **Backend**: Endpoints de la API (ej: `/api/users`)
- ✅ **Sin visibility ni status** - Los permisos son parte del sistema

## Estructura del Módulo

```
src/modules/authorization/
├── constants/
│   ├── app-type.enum.ts          # Frontend | Backend
│   └── policy-action.enum.ts     # Acciones (GET, POST, read, create, etc.)
├── entities/
│   └── casbin-rule.entity.ts     # Entidad para almacenar políticas
├── services/
│   └── authorization.service.ts  # Servicio de verificación con Casbin
├── guards/
│   └── permissions.guard.ts      # Guard global de permisos
├── decorators/
│   └── require-permission.decorator.ts  # @RequirePermission()
├── model.conf                    # Modelo RBAC de Casbin
├── authorization.module.ts
└── README.md

src/@core/database/seeds/
└── 03-permissions.seeder.ts      # Seed de permisos del sistema
```

## Instalación y Configuración

### 1. Dependencias

Ya instaladas:
```bash
npm install casbin typeorm-adapter
```

### 2. Ejecutar Migraciones

La entidad `CasbinRule` se crea automáticamente con las migraciones:

```bash
npm run migration:generate -- src/@core/database/migrations/AddCasbinRules
npm run migration:run
```

### 3. Cargar Permisos (Seeder)

Ejecutar el seeder para cargar los permisos predefinidos:

```bash
npm run seed:run
```

Esto cargará todos los permisos del sistema en la tabla `casbin_rule`.

## Uso en Endpoints

### Proteger un Endpoint con Permisos

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { RequirePermission } from '@modules/authorization'

@Controller('users')
export class UsersController {
  // Listar usuarios - Requiere permiso GET en /api/users
  @Get()
  @RequirePermission('/api/users', 'GET')
  async findAll() {
    return await this.usersService.findAll()
  }

  // Crear usuario - Requiere permiso POST en /api/users
  @Post()
  @RequirePermission('/api/users', 'POST')
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto)
  }

  // Actualizar usuario - Requiere permiso PATCH en /api/users/:id
  @Patch(':id')
  @RequirePermission('/api/users/:id', 'PATCH')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.usersService.update(id, dto)
  }

  // Eliminar usuario - Requiere permiso DELETE en /api/users/:id
  @Delete(':id')
  @RequirePermission('/api/users/:id', 'DELETE')
  async delete(@Param('id') id: string) {
    return await this.usersService.delete(id)
  }
}
```

### Rutas Públicas

Las rutas marcadas con `@Public()` del módulo de auth **NO** requieren permisos:

```typescript
import { Public } from '@modules/auth'

@Controller('public')
export class PublicController {
  @Get('stats')
  @Public() // No requiere autenticación NI permisos
  async getPublicStats() {
    return { stats: 'public data' }
  }
}
```

## Verificación Programática de Permisos

Si necesitas verificar permisos manualmente en tu código:

```typescript
import { AuthorizationService } from '@modules/authorization'

@Injectable()
export class MyService {
  constructor(
    private readonly authorizationService: AuthorizationService,
  ) {}

  async someMethod(user: JwtPayload) {
    // Verificar si el usuario tiene permiso
    const hasPermission = await this.authorizationService.checkPermission(
      user.roles,
      '/api/users',
      'GET',
    )

    if (!hasPermission) {
      throw new ForbiddenException('No tiene permisos')
    }

    // Continuar con la lógica...
  }
}
```

## Tipos de Permisos

### Frontend (Rutas Web)

- **Recurso**: Ruta de la aplicación (ej: `/admin/users`, `/admin/audits`)
- **Acciones**: `read`, `create`, `update`, `delete`

```typescript
// Ejemplo en seeder
{
  role: Role.ADMIN,
  resource: '/admin/users',
  action: PolicyAction.READ,
  app: AppType.FRONTEND,
  module: 'users',
}
```

### Backend (API Endpoints)

- **Recurso**: Endpoint de la API (ej: `/api/users`, `/api/audits/:id`)
- **Acciones**: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`

```typescript
// Ejemplo en seeder
{
  role: Role.ADMIN,
  resource: '/api/users',
  action: PolicyAction.GET,
  app: AppType.BACKEND,
  module: 'users',
}
```

## Agregar Nuevos Permisos

### Opción 1: Modificar el Seeder (Recomendado)

Edita `src/@core/database/seeds/03-permissions.seeder.ts`:

```typescript
// Agregar permiso para un nuevo módulo
permissions.push({
  role: Role.ADMIN,
  resource: '/api/reports',
  action: PolicyAction.GET,
  app: AppType.BACKEND,
  module: 'reports',
  description: 'Ver reportes',
})
```

Luego ejecuta:
```bash
npm run seed:run
```

### Opción 2: Programáticamente

```typescript
await this.authorizationService.addPermission(
  'admin',
  '/api/new-resource',
  'GET'
)

// Recargar políticas
await this.authorizationService.reloadPolicies()
```

## Flujo de Guards

El orden de ejecución de los guards es crítico:

1. **JwtAuthGuard** (AuthModule) - Verifica autenticación y carga `req.user`
2. **RolesGuard** (AuthModule) - Verifica roles con `@Roles()`
3. **PermissionsGuard** (AuthorizationModule) - Verifica permisos con `@RequirePermission()`

Si un endpoint tiene `@Public()`, **TODOS** los guards se saltan.

## Ejemplos de Permisos del Sistema

### Admin

- ✅ CRUD completo en usuarios (`/api/users`)
- ✅ CRUD completo en plantillas (`/api/templates`)
- ✅ CRUD completo en controles (`/admin/controls`)
- ✅ Cambiar estado de usuarios (`/api/users/:id/change-status`)

### Gerente

- ✅ Ver y editar usuarios (`/api/users`)
- ✅ Ver controles (`/admin/controls`)
- ✅ CRUD completo en auditorías (`/api/audits`)
- ✅ CRUD completo en evaluaciones (`/admin/assessments`)

### Auditor

- ✅ Ver su propio perfil (`/api/users/:id`)
- ✅ Ver auditorías asignadas (`/api/audits/:id`)
- ✅ Editar evaluaciones (`/admin/assessments`)

### Cliente

- ✅ Ver su propio perfil (`/api/users/:id`)
- ✅ Actualizar su perfil (`/api/users/:id/update-profile`)

## Debugging

### Ver permisos de un rol

```typescript
const permissions = await this.authorizationService.getPermissionsForRole('admin')
console.log('Admin permissions:', permissions)
```

### Ver todos los permisos en BD

```sql
SELECT * FROM casbin_rule ORDER BY v4, v0, v1;
```

## Modelo RBAC (model.conf)

El archivo `model.conf` define cómo funciona el sistema:

```conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
    || g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && r.act == p.act
```

- `sub`: Subject (rol del usuario)
- `obj`: Object (recurso)
- `act`: Action (acción)
- `keyMatch`: Soporta patrones como `/api/users/:id`

## Troubleshooting

### Error: "No tiene permisos para..."

1. Verificar que el usuario tenga el rol correcto
2. Verificar que el permiso esté en la BD:
   ```sql
   SELECT * FROM casbin_rule WHERE v0 = 'admin' AND v1 = '/api/users';
   ```
3. Ejecutar el seeder si falta: `npm run seed:run`

### Error: "Casbin enforcer not initialized"

El servicio no se inicializó correctamente. Verificar:
- Conexión a BD
- Archivo `model.conf` existe
- Tabla `casbin_rule` existe

### Recargar políticas después de cambios

```typescript
await this.authorizationService.reloadPolicies()
```

## Referencias

- [Casbin Documentation](https://casbin.org/docs/overview)
- [TypeORM Adapter](https://github.com/casbin/typeorm-adapter)
- [RBAC Model](https://casbin.org/docs/rbac)
