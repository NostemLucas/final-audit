# Módulo de Niveles de Madurez (Maturity Module)

## Resumen

Este módulo implementa el sistema de **frameworks de madurez** (COBIT 5, CMMI, etc.) para evaluar controles y normas en auditorías.

Los frameworks y sus niveles son **configuraciones globales** del sistema que se utilizan cuando se crea una auditoría específica.

---

## Componentes Creados

### ✅ Entidades

#### 1. `MaturityFrameworkEntity`
Framework de madurez (COBIT 5, CMMI, etc.)

**Ubicación:** `src/modules/maturity/entities/maturity-framework.entity.ts`

**Campos principales:**
- `name`: Nombre del framework (ej: "COBIT 5")
- `code`: Código único (ej: "cobit5")
- `minLevel` / `maxLevel`: Rango de niveles (ej: 0-5)
- `isActive`: Si está activo para uso
- `levels`: Relación OneToMany con MaturityLevelEntity

#### 2. `MaturityLevelEntity`
Nivel específico dentro de un framework

**Ubicación:** `src/modules/maturity/entities/maturity-level.entity.ts`

**Campos principales:**
- `frameworkId`: FK hacia MaturityFramework
- `level`: Número del nivel (0-5)
- `name`: Nombre del nivel (ej: "Definido")
- `shortName`: Nombre corto (ej: "Def")
- `color`: Color en hex (ej: "#EAB308")
- `icon`: Emoji o icono (ej: "🟡")
- `recommendations`: Recomendaciones para alcanzar este nivel
- `observations`: Observaciones típicas en este nivel

---

### ✅ Migración

**Archivo:** `src/@core/database/migrations/1768500000000-AddMaturityFrameworks.ts`

Crea las tablas:
- `maturity_frameworks`
- `maturity_levels`

Con relación FK entre ellas.

---

### ✅ Seeder con COBIT 5

**Archivos:**
- **Definición:** `src/@core/database/factories/maturity/cobit5.definition.ts`
- **Seeder:** `src/@core/database/seeds/05-maturity-frameworks.seeder.ts`

Incluye COBIT 5 completo con 6 niveles (0-5):

| Nivel | Nombre | Color | Descripción |
|-------|--------|-------|-------------|
| 0 | Inexistente | 🔴 #DC2626 | No existe proceso alguno |
| 1 | Inicial | 🟠 #EF4444 | Procesos ad-hoc y desorganizados |
| 2 | Repetible | 🟡 #F59E0B | Procesos siguen patrones regulares |
| 3 | Definido | 🟡 #EAB308 | Procesos documentados y estandarizados |
| 4 | Administrado | 🟢 #10B981 | Procesos monitoreados y medidos |
| 5 | Optimizado | ⭐ #22C55E | Mejora continua e innovación |

---

## Cómo Usar

### 1. Ejecutar Migración

```bash
# Ejecutar la migración para crear las tablas
npm run migration:run
```

### 2. Ejecutar Seeder

```bash
# Cargar datos de ejemplo (COBIT 5)
npm run seed:run
```

Esto cargará:
- ✅ Framework COBIT 5
- ✅ 6 niveles de madurez (0-5)
- ✅ Descripciones, colores, iconos, recomendaciones

### 3. Verificar en Base de Datos

```sql
-- Ver frameworks disponibles
SELECT * FROM maturity_frameworks;

-- Ver niveles de COBIT 5
SELECT
  level,
  name,
  "shortName",
  color,
  icon
FROM maturity_levels
WHERE "frameworkId" = (SELECT id FROM maturity_frameworks WHERE code = 'cobit5')
ORDER BY level;
```

---

## Ejemplo de Uso Futuro (en Auditorías)

Cuando se implemente el módulo de auditorías, funcionará así:

### 1. Crear Auditoría

```typescript
const audit = {
  name: "Auditoría ISO 27001 - ACME Corp",
  templateId: "uuid-template-iso27001",          // Plantilla ISO 27001
  maturityFrameworkId: "uuid-framework-cobit5",  // Framework COBIT 5
  organizationId: "uuid-organization",
  auditType: "inicial",
  startDate: new Date(),
  status: "en_progreso"
}
```

### 2. Evaluar Control/Norma

```typescript
const evaluation = {
  auditId: "uuid-audit",
  standardId: "uuid-standard-a5",                 // Control A.5 de ISO 27001
  expectedLevelId: "uuid-level-3",                // Se espera nivel 3 (Definido)
  obtainedLevelId: "uuid-level-2",                // Se obtuvo nivel 2 (Repetible)
  complianceStatus: "partial",                    // Cumplimiento parcial
  evidence: "Se encontró documentación...",
  observations: "El proceso existe pero no está totalmente estandarizado...",
  recommendations: "Formalizar el proceso y capacitar al personal..."
}
```

### 3. Calcular Brecha (Gap)

```typescript
const gap = expectedLevel - obtainedLevel  // 3 - 2 = 1 nivel de diferencia
```

### 4. Generar Reportes

Los niveles tienen **colores e iconos** que se usan en:
- 📊 Gráficos de madurez por área
- 📈 Dashboards de cumplimiento
- 📄 Reportes PDF con semáforo visual
- 📧 Emails de notificación

---

## Estructura de Archivos

```
src/modules/maturity/
├── entities/
│   ├── maturity-framework.entity.ts    ✅ Entidad Framework
│   ├── maturity-level.entity.ts        ✅ Entidad Level
│   └── index.ts                        ✅ Barrel export
├── MATURITY_SYSTEM.md                  ✅ Documentación detallada
└── README.md                           ✅ Este archivo

src/@core/database/
├── migrations/
│   └── 1768500000000-AddMaturityFrameworks.ts  ✅ Migración
├── seeds/
│   ├── 05-maturity-frameworks.seeder.ts        ✅ Seeder
│   └── run-seeds.ts                            ✅ Actualizado
└── factories/
    └── maturity/
        ├── cobit5.definition.ts                ✅ Definición COBIT 5
        └── index.ts                            ✅ Barrel export
```

---

## Próximos Pasos

Una vez que estés listo para usar el sistema:

### 1. Crear Módulo Completo

```bash
# Crear estructura de módulo completa
mkdir -p src/modules/maturity/{use-cases,repositories,controllers,dto}
```

### 2. Crear Repositorios

- `MaturityFrameworkRepository` extends `BaseRepository<MaturityFrameworkEntity>`
- `MaturityLevelRepository` extends `BaseRepository<MaturityLevelEntity>`

### 3. Crear Casos de Uso

- `FindMaturityFrameworksUseCase` - Listar frameworks
- `FindMaturityFrameworkByIdUseCase` - Ver un framework con sus niveles
- `CreateMaturityFrameworkUseCase` - Crear framework personalizado
- `UpdateMaturityFrameworkUseCase` - Editar framework
- `DeleteMaturityFrameworkUseCase` - Eliminar framework

### 4. Crear DTOs

- `CreateMaturityFrameworkDto`
- `UpdateMaturityFrameworkDto`
- `MaturityFrameworkResponseDto`
- `MaturityLevelResponseDto`

### 5. Crear Controladores

- `MaturityFrameworksController` - CRUD de frameworks
- Endpoints: GET, POST, PUT, DELETE `/maturity-frameworks`

### 6. Integrar con Auditorías

- Agregar campo `maturityFrameworkId` en `AuditEntity`
- Agregar campos `expectedLevelId` y `obtainedLevelId` en `EvaluationEntity`
- Crear lógica de cálculo de brechas (gaps)
- Crear reportes visuales con colores de niveles

---

## Agregar Más Frameworks

Para agregar CMMI, ISO/IEC 15504, o un framework personalizado:

### 1. Crear Definición

```typescript
// src/@core/database/factories/maturity/cmmi.definition.ts
export const CMMIFramework: MaturityFrameworkDefinition = {
  name: 'CMMI',
  code: 'cmmi',
  description: 'Capability Maturity Model Integration',
  minLevel: 1,
  maxLevel: 5,
  isActive: true,
  levels: [
    { level: 1, name: 'Inicial', ... },
    { level: 2, name: 'Gestionado', ... },
    { level: 3, name: 'Definido', ... },
    { level: 4, name: 'Cuantitativamente gestionado', ... },
    { level: 5, name: 'En optimización', ... },
  ]
}
```

### 2. Agregar al Seeder

```typescript
// En 05-maturity-frameworks.seeder.ts
import { COBIT5Framework, CMMIFramework } from '../factories/maturity'

const frameworks = [COBIT5Framework, CMMIFramework]
```

### 3. Ejecutar Seeder

```bash
npm run seed:run
```

---

## Documentación Adicional

Ver:
- `MATURITY_SYSTEM.md` - Documentación completa del sistema
- `CLAUDE.md` - Comandos y arquitectura general del proyecto

---

## Ventajas de esta Arquitectura

✅ **Flexibilidad** - Puedes tener múltiples frameworks (COBIT 5, CMMI, modelo propio)
✅ **Reutilización** - Los frameworks son globales, se usan en múltiples auditorías
✅ **Consistencia** - Mismos niveles y colores en todas las auditorías
✅ **Personalización** - Puedes crear frameworks personalizados
✅ **Separación** - Templates (QUÉ) vs Frameworks (CÓMO) vs Audits (CUÁNDO)
✅ **Visual** - Colores e iconos para reportes y dashboards
✅ **Completo** - Incluye recomendaciones y observaciones por nivel
