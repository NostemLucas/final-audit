# 🗄️ Configuración de Base de Datos - Arquitectura

Esta guía explica cómo está organizada la configuración de base de datos en el proyecto.

---

## 🎯 Problema Resuelto

**Antes**: Configuración duplicada en dos archivos separados
- ❌ `src/database/data-source.ts` - Para CLI/Migrations/Seeds
- ❌ `src/@core/config/database.config.ts` - Para la app NestJS
- ❌ Lógica duplicada y difícil de mantener

**Ahora**: Configuración compartida con separación de responsabilidades
- ✅ **Una sola fuente de verdad**: `database-shared.config.ts`
- ✅ **Dos adaptadores** para diferentes contextos
- ✅ Fácil de mantener y modificar

---

## 📁 Estructura de Archivos

```
src/
└── @core/
    ├── config/
    │   ├── database-shared.config.ts    ← ⭐ FUENTE DE VERDAD
    │   ├── database.config.ts           ← Adaptador para NestJS
    │   └── index.ts
    └── database/
        ├── config/
        │   └── data-source.ts           ← Adaptador para TypeORM CLI
        ├── migrations/                  ← Archivos de migrations
        ├── database.module.ts           ← Módulo de NestJS
        ├── transaction.service.ts       ← Servicio de transacciones
        └── transactional.decorator.ts   ← Decorator @Transactional()
```

✅ **TODO consolidado en `@core/database/`** - Un solo lugar para toda la infraestructura de DB

---

## 🔧 Archivos y Responsabilidades

### 1. `database-shared.config.ts` - ⭐ Configuración Compartida

**Responsabilidad**: Definir la configuración base de TypeORM que TODOS usan

**Funciones**:
- `getDatabaseOptions()` - Configuración para TypeORM CLI (migrations, seeds)
- `getDatabaseConfigForNestJS()` - Configuración adaptada para NestJS

**Características**:
- ✅ Soporta `DATABASE_URL` (prioridad)
- ✅ Fallback a variables separadas (`DB_HOST`, `DB_PORT`, etc.)
- ✅ Detecta automáticamente si está en desarrollo o producción
- ✅ Configura logger, entities paths, migrations, seeds

```typescript
// Prioridad de configuración:
// 1. DATABASE_URL (si existe)
// 2. Variables separadas DB_* (fallback)
```

### 2. `@core/database/config/data-source.ts` - Adaptador para CLI

**Responsabilidad**: Proveer DataSource para comandos de TypeORM CLI

**Ubicación**: `src/@core/database/config/data-source.ts`

**Usado por**:
- `npm run migration:generate`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed:run`

**Código**:
```typescript
import { getDatabaseOptions } from '@core/config/database-shared.config'

export const dataSourceOptions = getDatabaseOptions()
const dataSource = new DataSource(dataSourceOptions)
export default dataSource
```

**Migrations**: Se guardan en `src/@core/database/migrations/`

### 3. `database.config.ts` - Adaptador para NestJS

**Responsabilidad**: Proveer configuración para `TypeOrmModule.forRootAsync()`

**Usado por**:
- `DatabaseModule` (app en runtime)
- `ConfigService` de NestJS

**Código**:
```typescript
import { getDatabaseConfigForNestJS } from './database-shared.config'

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => getDatabaseConfigForNestJS(),
)
```

---

## 🔐 Variables de Entorno

### Opción 1: DATABASE_URL (Recomendada)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_db
```

**Ventajas**:
- ✅ Más simple (una sola variable)
- ✅ Formato estándar (compatible con Heroku, Railway, Render, etc.)
- ✅ Fácil de copiar/pegar
- ✅ Soporta SSL y parámetros adicionales: `?sslmode=require`

### Opción 2: Variables Separadas (Alternativa)

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=audit_core_db
```

**Ventajas**:
- ✅ Más granular
- ✅ Útil si cada variable viene de fuentes diferentes

**Nota**: Si `DATABASE_URL` existe, las variables `DB_*` son **ignoradas**.

---

## 🚀 Casos de Uso

### 1. Ejecutar Migrations

```bash
# La CLI usa src/database/data-source.ts
npm run migration:generate -- src/database/migrations/MyMigration
npm run migration:run
```

**Flow**:
1. TypeORM CLI carga `data-source.ts`
2. `data-source.ts` llama a `getDatabaseOptions()` de `database-shared.config.ts`
3. Se conecta a la DB usando la config compartida

### 2. Ejecutar Seeds

```bash
npm run seed:run
```

**Flow**: Igual que migrations, usa `data-source.ts` → `database-shared.config.ts`

### 3. Correr la App

```bash
npm run start:dev
```

**Flow**:
1. NestJS carga `DatabaseModule`
2. `DatabaseModule` usa `TypeOrmModule.forRootAsync()`
3. Lee configuración de `ConfigService` → `database.config.ts`
4. `database.config.ts` llama a `getDatabaseConfigForNestJS()` de `database-shared.config.ts`
5. Se conecta a la DB usando la config compartida

---

## ✅ Beneficios de esta Arquitectura

| Beneficio | Descripción |
|-----------|-------------|
| **DRY** | Don't Repeat Yourself - Una sola fuente de verdad |
| **Separación de responsabilidades** | CLI y App tienen sus propios adaptadores |
| **Fácil mantenimiento** | Cambios en un solo lugar |
| **Flexibilidad** | Soporta DATABASE_URL y variables separadas |
| **Type-safe** | TypeScript verifica tipos en toda la cadena |
| **Portable** | DATABASE_URL funciona en cualquier plataforma |

---

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                    .env (Variables)                     │
│  DATABASE_URL o DB_HOST, DB_PORT, DB_USERNAME, etc.    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│        @core/config/database-shared.config.ts           │
│              ⭐ FUENTE DE VERDAD ⭐                      │
│  - getDatabaseOptions()                                 │
│  - getDatabaseConfigForNestJS()                         │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌────────────────────────────┐  ┌──────────────────────────────┐
│  @core/database/config/    │  │  @core/config/               │
│  data-source.ts            │  │  database.config.ts          │
│  (CLI Adapter)             │  │  (NestJS Adapter)            │
│                            │  │                              │
│  TypeORM CLI               │  │  DatabaseModule              │
│  - Migrations →            │  │  - App Runtime               │
│    @core/database/         │  │  - ConfigService             │
│    migrations/             │  │                              │
│  - Seeds                   │  │                              │
└────────────────────────────┘  └──────────────────────────────┘
```

---

## 🛠️ Modificar la Configuración

### Cambiar timeout de queries

**Archivo**: `database-shared.config.ts`

```typescript
export function getDatabaseOptions() {
  return {
    // ...
    maxQueryExecutionTime: 2000, // Cambiar de 1000ms a 2000ms
  }
}
```

Esto afecta tanto CLI como App automáticamente ✅

### Agregar un nuevo seed path

**Archivo**: `database-shared.config.ts`

```typescript
export function getDatabaseOptions() {
  return {
    // ...
    seeds: [
      'src/database/seeds/*{.ts,.js}',
      'src/modules/**/seeds/*{.ts,.js}', // ← Nuevo path
    ],
  }
}
```

---

## 🧪 Verificar Configuración

### Test 1: Verificar que la app se conecta

```bash
npm run start:dev
```

Deberías ver en los logs:
```
[Database] Connected to PostgreSQL
```

### Test 2: Verificar que migrations funcionan

```bash
npm run migration:show
```

Deberías ver la lista de migrations.

### Test 3: Verificar que seeds funcionan

```bash
npm run seed:run
```

Deberías ver la ejecución de seeds.

---

## ❓ FAQ

### ¿Por qué no un solo archivo?

**TypeORM CLI** necesita un DataSource exportado como default, mientras que **NestJS** necesita opciones para `TypeOrmModule.forRootAsync()`. Son contratos diferentes, pero ambos usan la misma configuración base.

### ¿Puedo eliminar las variables DB_* si uso DATABASE_URL?

Sí, solo asegúrate de que `DATABASE_URL` esté definido.

### ¿Qué pasa si defino ambos (DATABASE_URL y DB_*)?

`DATABASE_URL` tiene **prioridad** y las variables `DB_*` serán **ignoradas**.

### ¿Cómo conecto a una DB en producción?

**Opción 1**: Usar DATABASE_URL del proveedor (Heroku, Railway, Render)
```bash
DATABASE_URL=postgresql://user:pass@host.com:5432/db?sslmode=require
```

**Opción 2**: Usar variables separadas
```bash
DB_HOST=mydb.aws.com
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=secret123
DB_DATABASE=audit_core_prod
```

---

## 📚 Relacionado

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Guía completa de configuración de entorno
- [CLAUDE.md](./CLAUDE.md) - Documentación del proyecto para Claude Code
- [TypeORM Documentation](https://typeorm.io/) - Documentación oficial de TypeORM

---

**Última actualización**: Enero 2026
**Mantenedor**: @limberg
