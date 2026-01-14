# Sistema de Niveles de Madurez (Maturity System)

## Descripción General

El sistema de niveles de madurez permite evaluar controles/normas usando frameworks estandarizados como **COBIT 5**, **CMMI**, **ISO/IEC 15504**, etc.

Los frameworks y sus niveles son **configuraciones globales** del sistema que se utilizan cuando se crea una **auditoría específica**.

---

## Arquitectura de Datos

### 1. Entidades Globales (Configuración del Sistema)

#### `MaturityFramework` (Frameworks de Madurez)
Frameworks globales configurables en el sistema.

**Ejemplos:**
- COBIT 5 (niveles 0-5)
- CMMI (niveles 1-5)
- ISO/IEC 15504 (niveles 0-5)
- Modelo Propio (personalizable)

**Campos:**
```typescript
{
  id: uuid
  name: string              // "COBIT 5"
  code: string              // "cobit5"
  description: string
  minLevel: number          // 0
  maxLevel: number          // 5
  isActive: boolean
  levels: MaturityLevel[]   // Relación OneToMany
}
```

#### `MaturityLevel` (Niveles dentro de cada Framework)
Define los niveles específicos de cada framework.

**Ejemplo COBIT 5:**
```typescript
[
  { level: 0, name: "Inexistente", color: "#DC2626", icon: "🔴" },
  { level: 1, name: "Inicial", color: "#EF4444", icon: "🟠" },
  { level: 2, name: "Repetible", color: "#F59E0B", icon: "🟡" },
  { level: 3, name: "Definido", color: "#EAB308", icon: "🟡" },
  { level: 4, name: "Administrado", color: "#10B981", icon: "🟢" },
  { level: 5, name: "Optimizado", color: "#22C55E", icon: "⭐" }
]
```

**Campos:**
```typescript
{
  id: uuid
  frameworkId: uuid         // FK → maturity_frameworks
  level: number             // 0-5
  name: string              // "Definido"
  shortName: string         // "Def"
  description: text         // Descripción completa del nivel
  color: string             // "#EAB308" (hex color)
  icon: string              // "🟡" (emoji/icon)
  recommendations: text     // Qué implementar para alcanzar este nivel
  observations: text        // Observaciones típicas en este nivel
  order: number             // Orden de visualización
  isMinimumAcceptable: bool // ¿Es el mínimo aceptable?
  isTarget: bool            // ¿Es el objetivo/meta?
}
```

---

### 2. Plantillas de Auditoría (Templates)

Las plantillas **NO** se relacionan directamente con frameworks.

```typescript
Template {
  id: uuid
  name: string              // "ISO 27001", "ASFI"
  version: string           // "2022", "v1.0"
  status: enum              // draft | published | archived
  standards: Standard[]     // Controles/normas
}
```

---

### 3. Relación en Auditorías (Futura Implementación)

Cuando se **crea una auditoría**, se combinan:
- **Template** (qué norma/plantilla auditar)
- **MaturityFramework** (cómo evaluar)
- **Organization** (a quién auditar)

```typescript
Audit {
  id: uuid
  name: string                    // "Auditoría ISO 27001 - ACME Corp"
  templateId: uuid                // FK → templates (ISO 27001)
  maturityFrameworkId: uuid       // FK → maturity_frameworks (COBIT 5)
  organizationId: uuid            // FK → organizations
  auditType: enum                 // inicial | seguimiento | recertificación
  startDate: Date
  endDate: Date
  status: enum                    // en_progreso | completada | cancelada
  evaluations: Evaluation[]       // Evaluaciones de cada standard
}
```

#### Evaluaciones (Evaluar cada control/norma)

```typescript
Evaluation {
  id: uuid
  auditId: uuid                   // FK → audits
  standardId: uuid                // FK → standards (control a evaluar)

  // Niveles de madurez
  expectedLevelId: uuid           // FK → maturity_levels (nivel esperado)
  obtainedLevelId: uuid           // FK → maturity_levels (nivel obtenido)

  // Puntajes (si aplica)
  expectedScore: number           // Puntaje esperado (ej: 100)
  obtainedScore: number           // Puntaje obtenido (ej: 75)

  // Resultado
  complianceStatus: enum          // compliant | non_compliant | partial | not_applicable

  // Evidencias
  evidence: text                  // Evidencias documentadas
  observations: text              // Observaciones del auditor
  recommendations: text           // Recomendaciones

  // Auditoría
  evaluatedBy: uuid               // FK → users (auditor)
  evaluatedAt: Date
}
```

---

## Flujo de Uso

### 1. Configuración Inicial (Admin del Sistema)

1. Crear **MaturityFrameworks** (COBIT 5, CMMI, etc.)
2. Definir **MaturityLevels** para cada framework (0-5 con colores, descripciones, etc.)

### 2. Crear Plantilla de Auditoría

1. Crear **Template** (ISO 27001, ASFI, etc.)
2. Definir **Standards** (controles/cláusulas) dentro del template

### 3. Ejecutar Auditoría

1. Crear **Audit** seleccionando:
   - Template a usar (ISO 27001)
   - Framework de madurez (COBIT 5)
   - Organización a auditar
2. Evaluar cada **Standard**:
   - Asignar nivel esperado (ej: Nivel 3 - Definido)
   - Asignar nivel obtenido (ej: Nivel 2 - Repetible)
   - Calcular brecha (gap): 3 - 2 = 1 nivel de diferencia
   - Registrar evidencias y observaciones
3. Generar reportes con:
   - Estado general de cumplimiento
   - Gráficos de niveles de madurez por área
   - Planes de acción para brechas detectadas

---

## Ejemplo: COBIT 5

### Framework Configuration

```typescript
const cobit5 = {
  name: "COBIT 5",
  code: "cobit5",
  description: "Framework de gobierno y gestión de TI empresarial",
  minLevel: 0,
  maxLevel: 5,
  isActive: true,
  levels: [
    {
      level: 0,
      name: "Inexistente",
      shortName: "N/A",
      description: "No existe proceso alguno. La organización no ha reconocido que existe un problema a resolver.",
      color: "#DC2626",
      icon: "🔴",
      recommendations: "Iniciar reconocimiento de la necesidad del proceso.",
      observations: "Falta total de procesos documentados o reconocidos.",
      order: 0
    },
    {
      level: 1,
      name: "Inicial",
      shortName: "Init",
      description: "Los procesos son ad-hoc y desorganizados. El éxito depende de esfuerzos individuales.",
      color: "#EF4444",
      icon: "🟠",
      recommendations: "Documentar procesos informales existentes.",
      observations: "Procesos informales, no repetibles, dependen de individuos clave.",
      order: 1
    },
    {
      level: 2,
      name: "Repetible",
      shortName: "Rep",
      description: "Los procesos siguen patrones regulares. Hay suficiente disciplina para repetir procedimientos anteriores.",
      color: "#F59E0B",
      icon: "🟡",
      recommendations: "Estandarizar procesos documentados y capacitar al personal.",
      observations: "Procesos intuitivos, se pueden repetir, pero no están formalmente documentados.",
      order: 2
    },
    {
      level: 3,
      name: "Definido",
      shortName: "Def",
      description: "Los procesos están documentados, estandarizados e integrados en toda la organización.",
      color: "#EAB308",
      icon: "🟡",
      recommendations: "Implementar métricas de rendimiento y monitoreo continuo.",
      observations: "Procesos documentados y comunicados mediante capacitación.",
      order: 3
    },
    {
      level: 4,
      name: "Administrado",
      shortName: "Adm",
      description: "Los procesos se monitorean y miden para cumplir objetivos individuales.",
      color: "#10B981",
      icon: "🟢",
      recommendations: "Implementar mejora continua basada en métricas.",
      observations: "Procesos medidos, monitoreados y bajo constante mejora.",
      order: 4
    },
    {
      level: 5,
      name: "Optimizado",
      shortName: "Opt",
      description: "Los procesos están en mejora continua basada en innovación y mejores prácticas.",
      color: "#22C55E",
      icon: "⭐",
      recommendations: "Mantener innovación continua y benchmark con la industria.",
      observations: "Mejora continua, innovación, uso de tecnologías avanzadas.",
      order: 5,
      isTarget: true
    }
  ]
}
```

---

## Ventajas de esta Arquitectura

1. **Flexibilidad**: Puedes tener múltiples frameworks (COBIT 5, CMMI, modelo propio)
2. **Reutilización**: Los frameworks son globales, se usan en múltiples auditorías
3. **Consistencia**: Mismos niveles y colores en todas las auditorías que usen el mismo framework
4. **Personalización**: Puedes crear frameworks personalizados para cada cliente
5. **Separación de conceptos**:
   - Templates = QUÉ auditar (normas/controles)
   - Frameworks = CÓMO evaluar (niveles de madurez)
   - Audits = CUÁNDO y A QUIÉN auditar

---

## Próximos Pasos

1. ✅ Crear entidades `MaturityFramework` y `MaturityLevel`
2. ⏳ Crear migración de base de datos
3. ⏳ Crear seeder con ejemplo de COBIT 5
4. ⏳ Crear repositorios y casos de uso
5. ⏳ Crear controladores y endpoints API
6. ⏳ Integrar con módulo de auditorías (cuando se cree)
