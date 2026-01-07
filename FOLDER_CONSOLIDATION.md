# 📁 Consolidación de Carpetas Database

## ❓ Pregunta Original

> "Tengo dos carpetas llamadas database, son para propósitos diferentes, eso lo sé, pero no estoy seguro si está bien tenerlas separadas"

## ✅ Respuesta: CONSOLIDADO en una sola carpeta

---

## 📊 ANTES vs DESPUÉS

### ❌ ANTES - Dos carpetas separadas

```
src/
├── @core/
│   └── database/              ← Módulo, Services, Decorators
│       ├── database.module.ts
│       ├── transaction.service.ts
│       └── transactional.decorator.ts
│
└── database/                  ← Migrations, DataSource, deprecated
    ├── data-source.ts
    ├── migrations/
    └── transaction-manager.service.ts (no usado)
```

**Problemas:**
- ❌ Confuso tener 2 carpetas con el mismo nombre
- ❌ No sigue el patrón de `@core`
- ❌ Difícil de encontrar archivos
- ❌ Contiene código deprecated (`transaction-manager.service.ts`)

---

### ✅ DESPUÉS - Una sola carpeta consolidada

```
src/
└── @core/
    └── database/              ← TODO consolidado aquí
        ├── config/
        │   └── data-source.ts           ← DataSource para CLI
        ├── migrations/                  ← Migrations de TypeORM
        │   └── 1767384027398-InitialSchema.ts
        ├── database.module.ts           ← Módulo de NestJS
        ├── transaction.service.ts       ← Servicio de transacciones
        ├── transactional.decorator.ts   ← Decorator @Transactional()
        ├── index.ts                     ← Barrel exports
        └── README.md                    ← Documentación
```

**Beneficios:**
- ✅ Todo en un solo lugar: `@core/database/`
- ✅ Sigue el patrón del proyecto (`@core/logger`, `@core/email`, etc.)
- ✅ Más fácil de encontrar y mantener
- ✅ Código deprecated eliminado
- ✅ Estructura clara y organizada

---

## 🔧 Cambios Realizados

### 1. Movimientos de archivos

```bash
# Creado
src/@core/database/config/

# Movido
src/database/data-source.ts
  → src/@core/database/config/data-source.ts

# Movido
src/database/migrations/
  → src/@core/database/migrations/

# Eliminado
src/database/                              ← Carpeta completa eliminada
src/database/transaction-manager.service.ts ← Código deprecated
```

### 2. Archivos actualizados

**`package.json`** - Scripts de migrations:
```json
{
  "migration:generate": "... -d src/@core/database/config/data-source.ts",
  "migration:run": "... -d src/@core/database/config/data-source.ts",
  "migration:revert": "... -d src/@core/database/config/data-source.ts",
  "migration:show": "... -d src/@core/database/config/data-source.ts"
}
```

**`database-shared.config.ts`** - Rutas de migrations:
```typescript
migrations: ['src/@core/database/migrations/*{.ts,.js}']
seeds: ['src/@core/database/seeds/*{.ts,.js}']
```

**`DATABASE_CONFIG.md`** - Documentación actualizada con nueva estructura

---

## 🎯 Por qué esta estructura

### Sigue el patrón `@core`

Todos los módulos de infraestructura compartida están en `@core`:

```
src/@core/
├── config/       ← Configuraciones globales
├── database/     ← ⭐ Infraestructura de DB (NUEVO)
├── email/        ← Servicio de emails
├── files/        ← Servicio de archivos
├── logger/       ← Sistema de logging
├── repositories/ ← Base repository
└── ...
```

### Organización lógica

```
@core/database/
├── config/          ← Configuración y DataSource
├── migrations/      ← Archivos de migrations
├── *.module.ts      ← Módulo de NestJS
├── *.service.ts     ← Servicios
└── *.decorator.ts   ← Decorators
```

---

## ✅ Verificación

### Build exitoso
```bash
npm run build
# ✅ webpack 5.103.0 compiled successfully
```

### Comandos funcionando
```bash
npm run migration:show
# ✅ Encuentra data-source.ts correctamente
```

---

## 📚 Responsabilidades de cada archivo

| Archivo | Responsabilidad |
|---------|----------------|
| `config/data-source.ts` | DataSource para TypeORM CLI (migrations, seeds) |
| `migrations/` | Archivos de migrations generados por TypeORM |
| `database.module.ts` | Módulo global de NestJS para DB |
| `transaction.service.ts` | Servicio para manejar transacciones con CLS |
| `transactional.decorator.ts` | Decorator `@Transactional()` para métodos |

---

## 🎓 Lección Aprendida

### ❌ Anti-patrón: Múltiples carpetas con el mismo nombre
- Confuso para desarrolladores nuevos
- Difícil de navegar
- No está claro cuál es cuál

### ✅ Patrón recomendado: Consolidación bajo `@core`
- Todo en un solo lugar
- Sigue convenciones del proyecto
- Fácil de mantener
- Claro y predecible

---

## 🔄 Migración para otros proyectos

Si tienes un proyecto similar con carpetas duplicadas:

1. **Identifica propósito de cada carpeta**
   - ¿Qué contiene cada una?
   - ¿Hay código deprecated?

2. **Consolida en `@core`**
   - Mueve todo a `@core/nombre-modulo/`
   - Crea subcarpetas lógicas (`config/`, `migrations/`, etc.)

3. **Actualiza referencias**
   - Scripts en `package.json`
   - Rutas en archivos de config
   - Imports en código

4. **Verifica que funcione**
   - `npm run build`
   - `npm test`
   - Comandos CLI

---

## 🎯 Resumen

| Aspecto | Estado |
|---------|--------|
| Estructura | ✅ Consolidada en `@core/database/` |
| Patrón | ✅ Sigue convención `@core` |
| Código deprecated | ✅ Eliminado |
| Scripts | ✅ Actualizados |
| Documentación | ✅ Actualizada |
| Build | ✅ Exitoso |

**Resultado**: Una sola carpeta `@core/database/` con toda la infraestructura de base de datos organizada lógicamente 🎯

---

**Fecha**: Enero 2026
**Autor**: @limberg
