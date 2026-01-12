# Guía de Permisos - Decoradores Explícitos vs Automáticos

## 🎯 Resumen Ejecutivo

Ahora tienes **DOS formas** de proteger tus endpoints con permisos:

| Característica | @RequirePermission() | @CheckPermissions() |
|---------------|---------------------|---------------------|
| **Tipo** | Explícito | Automático |
| **Código** | Más verboso | Menos código |
| **Flexibilidad** | Total | Requiere convención |
| **Errores** | Más propenso a typos | Menos propenso |
| **Uso recomendado** | Rutas custom o especiales | Rutas estándar REST |

## 📖 Modo 1: Explícito con @RequirePermission()

### ¿Cuándo usar?
- Cuando la ruta del endpoint NO coincide con el seeder
- Cuando necesitas control total sobre resource/action
- Cuando tienes rutas complejas o custom

### Ejemplo

```typescript
import { Controller, Get, Post, Patch, Delete } from '@nestjs/common'
import { RequirePermission } from '@modules/authorization'

@Controller('users')
export class UsersController {
  @Get()
  @RequirePermission('/api/users', 'GET')
  async findAll() {
    return await this.usersService.findAll()
  }

  @Post()
  @RequirePermission('/api/users', 'POST')
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto)
  }

  @Patch(':id')
  @RequirePermission('/api/users/:id', 'PATCH')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.usersService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermission('/api/users/:id', 'DELETE')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id)
  }
}
```

### ✅ Ventajas
- Control total sobre resource y action
- Puedes usar rutas que NO siguen el patrón `/api/...`
- Documentación explícita en el código
- No depende de convenciones

### ❌ Desventajas
- Más código repetitivo
- Propenso a errores de tipeo
- Si cambias la ruta del controller, debes actualizar todos los decorators

---

## 🚀 Modo 2: Automático con @CheckPermissions() (RECOMENDADO)

### ¿Cuándo usar?
- Cuando tus rutas siguen el patrón estándar `/api/{controller}/{método}`
- Cuando quieres menos código boilerplate
- Cuando prefieres DRY (Don't Repeat Yourself)

### Ejemplo

```typescript
import { Controller, Get, Post, Patch, Delete } from '@nestjs/common'
import { CheckPermissions } from '@modules/authorization'

@Controller('users')
export class UsersController {
  // Detecta automáticamente: /api/users + GET
  @Get()
  @CheckPermissions()
  async findAll() {
    return await this.usersService.findAll()
  }

  // Detecta automáticamente: /api/users + POST
  @Post()
  @CheckPermissions()
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto)
  }

  // Detecta automáticamente: /api/users/:id + PATCH
  @Patch(':id')
  @CheckPermissions()
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.usersService.update(id, dto)
  }

  // Detecta automáticamente: /api/users/:id + DELETE
  @Delete(':id')
  @CheckPermissions()
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id)
  }
}
```

### ✅ Ventajas
- **Menos código** - Un solo decorator sin parámetros
- **Menos errores** - No hay riesgo de escribir mal la ruta
- **DRY** - La ruta se define solo una vez (en el controller/método)
- **Mantenible** - Si cambias `@Controller('users')`, el permiso se actualiza automáticamente

### ❌ Desventajas
- Requiere que tus rutas sigan el patrón `/api/{controller}/{método}`
- Menos flexibilidad
- La ruta en el seeder DEBE coincidir exactamente

### ⚙️ Cómo funciona

El guard automáticamente:

1. **Detecta el path del controller**: `@Controller('users')` → `users`
2. **Detecta el path del método**: `@Get(':id')` → `:id`
3. **Construye la ruta completa**: `/api/users/:id`
4. **Detecta el método HTTP**: `@Get()` → `GET`
5. **Verifica con Casbin**: `checkPermission(['admin'], '/api/users/:id', 'GET')`

---

## 🎨 Comparación Lado a Lado

### Ejemplo: UsersController

#### Con @RequirePermission (Explícito)

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @RequirePermission('/api/users', 'GET')  // 👈 Especificar manualmente
  async findAll() { }

  @Post()
  @RequirePermission('/api/users', 'POST')  // 👈 Especificar manualmente
  async create() { }

  @Patch(':id')
  @RequirePermission('/api/users/:id', 'PATCH')  // 👈 Especificar manualmente
  async update() { }
}
```

**Total**: 3 líneas extra de código

#### Con @CheckPermissions (Automático) ✨

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @CheckPermissions()  // 👈 Detecta automáticamente
  async findAll() { }

  @Post()
  @CheckPermissions()  // 👈 Detecta automáticamente
  async create() { }

  @Patch(':id')
  @CheckPermissions()  // 👈 Detecta automáticamente
  async update() { }
}
```

**Total**: 3 líneas simples, sin repetir rutas

---

## 🔧 Configuración del Seeder

### IMPORTANTE: La ruta debe coincidir

Para usar `@CheckPermissions()`, tus permisos en el seeder deben seguir el patrón:

```typescript
// src/@core/database/seeds/03-permissions.seeder.ts

// ✅ CORRECTO - Coincide con @Controller('users')
permissions.push({
  role: Role.ADMIN,
  resource: '/api/users',      // 👈 /api + controller
  action: PolicyAction.GET,
  app: AppType.BACKEND,
  module: 'users',
})

// ✅ CORRECTO - Coincide con @Patch(':id')
permissions.push({
  role: Role.ADMIN,
  resource: '/api/users/:id',  // 👈 /api + controller + /:id
  action: PolicyAction.PATCH,
  app: AppType.BACKEND,
  module: 'users',
})
```

---

## 💡 Recomendación Final

### 🏆 Usa @CheckPermissions() para:
- Controladores REST estándar (users, audits, templates, etc.)
- Endpoints que siguen convención `/api/{recurso}`
- La mayoría de tu código (90%)

### 🎯 Usa @RequirePermission() para:
- Rutas custom (`/api/users/:id/change-status`, `/api/reports/export`, etc.)
- Endpoints especiales que no siguen la convención
- Casos donde necesitas más control (10%)

---

## 📝 Ejemplos Completos

### Ejemplo 1: Controller REST Estándar (Automático)

```typescript
import { CheckPermissions } from '@modules/authorization'

@Controller('audits')
export class AuditsController {
  @Get()
  @CheckPermissions()
  async findAll() { }

  @Get(':id')
  @CheckPermissions()
  async findOne(@Param('id') id: string) { }

  @Post()
  @CheckPermissions()
  async create(@Body() dto: CreateAuditDto) { }

  @Patch(':id')
  @CheckPermissions()
  async update(@Param('id') id: string, @Body() dto: UpdateAuditDto) { }

  @Delete(':id')
  @CheckPermissions()
  async remove(@Param('id') id: string) { }
}
```

### Ejemplo 2: Controller con Rutas Custom (Explícito)

```typescript
import { RequirePermission } from '@modules/authorization'

@Controller('users')
export class UsersController {
  // Ruta estándar - podrías usar @CheckPermissions()
  @Get()
  @RequirePermission('/api/users', 'GET')
  async findAll() { }

  // Ruta custom - mejor usar @RequirePermission()
  @Patch(':id/change-status')
  @RequirePermission('/api/users/:id/change-status', 'PATCH')
  async changeStatus(@Param('id') id: string) { }

  // Ruta custom - mejor usar @RequirePermission()
  @Post(':id/assign-role')
  @RequirePermission('/api/users/:id/assign-role', 'POST')
  async assignRole(@Param('id') id: string) { }
}
```

### Ejemplo 3: Mixto (Recomendado)

```typescript
import { RequirePermission, CheckPermissions } from '@modules/authorization'

@Controller('users')
export class UsersController {
  // Rutas estándar - automático
  @Get()
  @CheckPermissions()
  async findAll() { }

  @Get(':id')
  @CheckPermissions()
  async findOne(@Param('id') id: string) { }

  @Post()
  @CheckPermissions()
  async create(@Body() dto: CreateUserDto) { }

  // Rutas custom - explícito
  @Patch(':id/change-status')
  @RequirePermission('/api/users/:id/change-status', 'PATCH')
  async changeStatus(@Param('id') id: string) { }

  @Patch(':id/update-profile')
  @RequirePermission('/api/users/:id/update-profile', 'PATCH')
  async updateProfile(@Param('id') id: string) { }
}
```

---

## 🐛 Troubleshooting

### Error: "No tiene permisos para GET en /api/users"

**Causa**: El permiso no existe en la BD

**Solución**:
1. Verifica que el seeder tenga el permiso:
   ```sql
   SELECT * FROM casbin_rule
   WHERE v1 = '/api/users' AND v2 = 'GET';
   ```
2. Si falta, agrégalo al seeder y ejecuta: `npm run seed:run`

### Error: La ruta detectada no coincide

**Causa**: Tu controller no sigue el patrón `/api/{controller}`

**Solución**: Usa `@RequirePermission()` en lugar de `@CheckPermissions()`

### ¿Cómo saber qué ruta detectó?

Agrega logging temporal en el guard:

```typescript
// En permissions.guard.ts
const detectedRoute = this.detectRoute(context)
console.log('Ruta detectada:', detectedRoute)
```

---

## 🎉 Resumen

- **@CheckPermissions()** → Automático, menos código, DRY (recomendado para 90% de casos)
- **@RequirePermission('/ruta', 'accion')** → Explícito, más control (para casos especiales)
- Ambos funcionan con el mismo PermissionsGuard
- Puedes mezclar ambos en el mismo controller
- La ruta en el seeder debe coincidir con la estructura de tu controller
