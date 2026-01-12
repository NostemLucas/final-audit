# Guía de Configuración - Módulo de Autorización con Casbin

## ✅ Cambios Realizados y Mejoras

### 1. **Correcciones de Errores**

#### Error en CasbinRule Entity
- **Problema**: TypeORM detectaba los tipos como "Object" en lugar de varchar
- **Solución**: Se agregó explícitamente `type: 'varchar'` en todos los campos `@Column()`
- **Ubicación**: `src/modules/authorization/entities/casbin-rule.entity.ts`

#### Error en Seeder Delete
- **Problema**: `repository.delete({})` no está permitido en TypeORM
- **Solución**: Cambio a `dataSource.query('DELETE FROM casbin_rule')`
- **Ubicación**: `src/@core/database/seeds/03-permissions.seeder.ts`

### 2. **Reorganización de Estructura**

#### Ubicación de Seeders
- **Antes**: `src/modules/authorization/seeders/permissions.seeder.ts`
- **Ahora**: `src/@core/database/seeds/03-permissions.seeder.ts`
- **Razón**: Seguir el patrón del proyecto donde todos los seeders están centralizados

#### Estructura Final Mejorada
```
src/modules/authorization/
├── constants/          # Enums y constantes
├── entities/          # CasbinRule entity
├── services/          # AuthorizationService
├── guards/            # PermissionsGuard
├── decorators/        # @RequirePermission()
├── model.conf         # Modelo RBAC de Casbin
└── README.md

src/@core/database/seeds/
├── 01-organizations.seeder.ts
├── 02-users.seeder.ts
└── 03-permissions.seeder.ts  ← Seeder de permisos Casbin
```

### 3. **Validación y Pruebas**

✅ Build compila correctamente
✅ Migraciones generadas y ejecutadas exitosamente
✅ Seeder funciona correctamente
✅ Permisos cargados en base de datos:
- **Admin**: 30 permisos
- **Gerente**: 26 permisos
- **Auditor**: 10 permisos
- **Cliente**: 7 permisos

## 📋 Pasos para Implementar

### 1. Base de Datos

La migración ya fue ejecutada. Si necesitas regenerarla:

```bash
# Generar migración (ya hecho)
npm run migration:generate -- src/@core/database/migrations/AddCasbinRules

# Ejecutar migración (ya hecho)
npm run migration:run
```

### 2. Cargar Permisos

```bash
# Ejecutar todos los seeders (incluye permisos)
npm run seed:run

# O solo cargar permisos (si ya tienes orgs y usuarios)
# Editar run-seeds.ts para ejecutar solo PermissionsSeeder
```

### 3. Proteger Endpoints

```typescript
import { Controller, Get, Post, Patch } from '@nestjs/common'
import { RequirePermission } from '@modules/authorization'

@Controller('users')
export class UsersController {
  // GET /api/users - Solo admin y gerente
  @Get()
  @RequirePermission('/api/users', 'GET')
  async findAll() {
    return await this.usersService.findAll()
  }

  // POST /api/users - Solo admin y gerente
  @Post()
  @RequirePermission('/api/users', 'POST')
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto)
  }

  // PATCH /api/users/:id - Solo admin y gerente
  @Patch(':id')
  @RequirePermission('/api/users/:id', 'PATCH')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.usersService.update(id, dto)
  }
}
```

### 4. Rutas Públicas

Las rutas con `@Public()` del AuthModule automáticamente bypasean los permisos:

```typescript
@Public()
@Get('public-stats')
async getPublicStats() {
  // No requiere autenticación ni permisos
}
```

## 🎯 Orden de Ejecución de Guards

1. **JwtAuthGuard** (AuthModule) → Verifica JWT y carga `req.user`
2. **RolesGuard** (AuthModule) → Verifica `@Roles()` si está presente
3. **PermissionsGuard** (AuthorizationModule) → Verifica `@RequirePermission()` con Casbin

## 📊 Permisos por Rol

### Admin (30 permisos)
- **Frontend**: Home, Profile (CRUD), Users (CRUD), Templates (CRUD), Controls (CRUD)
- **Backend**: /api/users (todas las operaciones), /api/roles, /api/templates (CRUD), cambiar estado de usuarios

### Gerente (26 permisos)
- **Frontend**: Home, Profile (CRUD), Controls (read), Audits (CRUD), Assessments (CRUD)
- **Backend**: /api/users (ver/editar), /api/roles, /api/audits (CRUD)

### Auditor (10 permisos)
- **Frontend**: Home, Profile (CRUD), Assessments (read/update)
- **Backend**: /api/users/:id (solo su perfil), /api/audits/:id (ver)

### Cliente (7 permisos)
- **Frontend**: Home, Profile (CRUD)
- **Backend**: /api/users/:id (solo su perfil), update-profile

## 🔧 Agregar Nuevos Permisos

### Editar el Seeder

Archivo: `src/@core/database/seeds/03-permissions.seeder.ts`

```typescript
// Agregar nuevos permisos
permissions.push({
  role: Role.ADMIN,
  resource: '/api/reports',
  action: PolicyAction.GET,
  app: AppType.BACKEND,
  module: 'reports',
  description: 'Ver reportes del sistema',
})
```

Luego ejecutar:
```bash
npm run seed:run
```

### Agregar Dinámicamente

```typescript
// En un servicio o controller
await this.authorizationService.addPermission(
  'admin',
  '/api/new-resource',
  'GET'
)

// Recargar políticas para aplicar cambios
await this.authorizationService.reloadPolicies()
```

## 🐛 Debugging

### Ver permisos en BD

```sql
-- Todos los permisos
SELECT * FROM casbin_rule ORDER BY v4, v0, v1;

-- Permisos de un rol
SELECT * FROM casbin_rule WHERE v0 = 'admin';

-- Permisos por módulo
SELECT v0 as role, v4 as module, COUNT(*) as total
FROM casbin_rule
WHERE ptype = 'p'
GROUP BY v0, v4
ORDER BY v4, v0;
```

### Verificar permisos desde código

```typescript
const permissions = await this.authorizationService.getPermissionsForRole('admin')
console.log('Admin permissions:', permissions)
```

## 📚 Documentación

- **Módulo**: `src/modules/authorization/README.md` (documentación completa)
- **Casbin Docs**: https://casbin.org/docs/overview
- **RBAC Model**: https://casbin.org/docs/rbac

## ⚠️ Notas Importantes

1. **Orden de Guards**: PermissionsGuard DEBE ejecutarse DESPUÉS de JwtAuthGuard (ya configurado en AppModule)

2. **Parámetros Dinámicos**: Los recursos con `:id` se resuelven automáticamente
   - Definir en seeder: `/api/users/:id`
   - Casbin matchea: `/api/users/123`, `/api/users/abc`, etc.

3. **Sin Visibility/Status**: Los permisos NO son administrables desde la UI, son parte del sistema

4. **Recarga de Políticas**: Después de modificar permisos en BD, llamar a `reloadPolicies()`

5. **Testing**: El error en UsersSeeder es preexistente, NO relacionado con Casbin

## ✨ Próximos Pasos

1. ✅ Ejecutar `npm run seed:run` para cargar permisos (si aún no lo hiciste)
2. ✅ Agregar `@RequirePermission()` a tus controllers existentes
3. ✅ Probar autenticación + autorización con diferentes roles
4. ✅ Ajustar permisos según tus necesidades en el seeder
5. ✅ Documentar permisos personalizados en tu README

---

**¡El módulo de autorización está listo para usar!** 🎉
