

# Sistema de Auditorías - Evaluaciones y Ponderaciones

## Descripción General

El sistema de auditorías permite evaluar organizaciones usando:
- **Templates**: QUÉ auditar (ISO 27001, ASFI, etc.)
- **Maturity Frameworks**: CÓMO evaluar (COBIT 5, CMMI)
- **Evaluaciones**: Resultados por control
- **Ponderaciones**: Pesos por sección para cálculo de score final

**IMPORTANTE:** Este sistema soporta **jerarquías multinivel** (2, 3, 4+ niveles de profundidad).
Ver [MULTILEVEL_SCORING.md](./MULTILEVEL_SCORING.md) para detalles sobre cómo funciona el cálculo recursivo en estructuras como ISO 27001 (A.5 → A.5.1 → A.5.1.1).

---

## Arquitectura de Datos

### Relación entre Entidades

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AUDIT                                     │
│  - Combina Template + Framework + Organization                     │
│  - Define niveles por defecto (expected/target)                    │
│  - Almacena score total y progreso                                 │
└──────────────────┬──────────────────────────────────┬───────────────┘
                   │                                  │
         ┌─────────▼──────────┐           ┌──────────▼─────────────┐
         │    EVALUATIONS     │           │   STANDARD_WEIGHTS     │
         │ (controles hijos)  │           │  (secciones padre)     │
         └────────────────────┘           └────────────────────────┘
```

---

## 1. Entidad: Audit

**Propósito**: Representa una auditoría específica a una organización.

**Campos Clave**:
```typescript
{
  // Identificación
  name: "Auditoría ISO 27001 - ACME Corp 2024"

  // Configuración
  templateId: uuid              // ISO 27001
  maturityFrameworkId: uuid     // COBIT 5
  organizationId: uuid          // ACME Corp

  // Niveles por defecto (opcional)
  defaultExpectedLevelId: uuid  // Nivel 3 por defecto
  defaultTargetLevelId: uuid    // Nivel 4 por defecto

  // Resultados (calculados)
  totalScore: 78.5              // Score total (0-100)
  complianceRate: 85.2          // % de controles que cumplen
  totalControls: 114            // Total de controles a evaluar
  evaluatedControls: 100        // Controles ya evaluados

  // Relaciones
  evaluations: Evaluation[]
  standardWeights: StandardWeight[]
}
```

---

## 2. Entidad: Evaluation

**Propósito**: Evalúa un CONTROL INDIVIDUAL (hoja del árbol).

**Regla Importante**:
- ✅ Solo se evalúan controles con `isAuditable = true`
- ❌ NO se evalúan secciones padre (A.5, A.6, etc.)

**Campos Clave**:
```typescript
{
  auditId: uuid
  standardId: uuid          // ⚠️ Debe ser un control evaluable (hoja)

  // Niveles de madurez
  expectedLevelId: uuid     // Nivel mínimo requerido
  obtainedLevelId: uuid     // Nivel obtenido en la evaluación
  targetLevelId: uuid       // Nivel objetivo

  // Resultados calculados
  score: 66.67              // obtained/expected * 100 = 2/3 * 100
  gap: -2                   // target - obtained = 4 - 2
  complianceStatus: "partial"

  // Documentación
  evidence: "Se encontró política documentada..."
  observations: "La política existe desde hace 6 meses..."
  recommendations: "Implementar programa de capacitación..."
  actionPlan: "1. Diseñar programa... 2. Capacitar..."
  dueDate: "2024-06-30"

  // Auditoría
  evaluatedBy: uuid
  evaluatedAt: Date
}
```

**Cálculo de Score**:
```typescript
// Ejemplo 1: Cumple parcialmente
obtained = Nivel 2 (Repetible)
expected = Nivel 3 (Definido)
score = (2 / 3) * 100 = 66.67%
complianceStatus = PARTIAL

// Ejemplo 2: Cumple completamente
obtained = Nivel 3
expected = Nivel 3
score = (3 / 3) * 100 = 100%
complianceStatus = COMPLIANT

// Ejemplo 3: Supera expectativa
obtained = Nivel 4
expected = Nivel 3
score = (4 / 3) * 100 = 133.33%
complianceStatus = COMPLIANT
```

---

## 3. Entidad: StandardWeight

**Propósito**: Define el peso de las SECCIONES PRINCIPALES (padres).

**Regla Importante**:
- ✅ Solo se crean pesos para standards PADRE
- ❌ NO se crean pesos para controles individuales

**Ejemplo ISO 27001**:
```typescript
// Se crean pesos solo para las 11 secciones principales:
[
  { standardId: "A.5",  weight: 10 },  // Políticas de Seguridad
  { standardId: "A.6",  weight: 15 },  // Organización
  { standardId: "A.7",  weight: 10 },  // Recursos Humanos
  { standardId: "A.8",  weight: 15 },  // Gestión de Activos
  { standardId: "A.9",  weight: 15 },  // Control de Acceso
  { standardId: "A.10", weight: 5  },  // Criptografía
  { standardId: "A.11", weight: 10 },  // Seguridad Física
  { standardId: "A.12", weight: 10 },  // Seguridad Operacional
  // ...
]
// Total: 100%
```

**Campos Clave**:
```typescript
{
  auditId: uuid
  standardId: uuid          // ⚠️ Standard PADRE (A.5, A.6, etc.)

  // Ponderación
  weight: 15                // Esta sección vale 15% del total

  // Scores
  calculatedScore: 83.34    // Promedio de evaluaciones de controles hijos
  manualScore: 80           // Override manual (opcional)
  manualScoreJustification: "Aunque controles cumplen individualmente..."

  // Progreso
  totalControls: 12         // Controles en esta sección
  evaluatedControls: 10     // Controles ya evaluados
}
```

---

## Flujo de Cálculo de Scores

### Paso 1: Evaluar Controles Individuales (Evaluations)

```typescript
// Sección A.5 tiene 2 controles:
Evaluation A.5.1 {
  expectedLevel: Nivel 3
  obtainedLevel: Nivel 2
  score: 66.67  // 2/3 * 100
}

Evaluation A.5.2 {
  expectedLevel: Nivel 3
  obtainedLevel: Nivel 3
  score: 100    // 3/3 * 100
}
```

### Paso 2: Calcular Score de Sección (StandardWeight)

```typescript
StandardWeight A.5 {
  // Calcular promedio de controles hijos
  calculatedScore = avg(66.67, 100) = 83.34

  // Aplicar peso
  weight = 10  // Vale 10% del total
}
```

### Paso 3: Calcular Score Total (Audit)

```typescript
// Obtener todas las secciones con sus scores y pesos
sections = [
  { section: "A.5",  score: 83.34, weight: 10 },
  { section: "A.6",  score: 75.00, weight: 15 },
  { section: "A.7",  score: 90.00, weight: 10 },
  { section: "A.8",  score: 80.00, weight: 15 },
  // ...
]

// Calcular score ponderado
totalWeight = sum(weights) = 10 + 15 + 10 + 15 + ... = 100
weightedSum = sum(score * weight)
            = (83.34 * 10) + (75 * 15) + (90 * 10) + (80 * 15) + ...
            = 833.4 + 1125 + 900 + 1200 + ...

totalScore = weightedSum / totalWeight
           = 8558.4 / 100
           = 85.58%
```

---

## Jerarquía de Standards (ISO 27001)

```
ISO 27001 Anexo A
│
├── A.5 Políticas de Seguridad (PADRE - weight=10)
│   ├── A.5.1 Políticas de seguridad (HIJO - evaluation)
│   └── A.5.2 Revisión de políticas (HIJO - evaluation)
│       calculatedScore = avg(A.5.1.score, A.5.2.score)
│
├── A.6 Organización de la Seguridad (PADRE - weight=15)
│   ├── A.6.1 Organización interna (HIJO - evaluation)
│   ├── A.6.2 Dispositivos móviles (HIJO - evaluation)
│   └── A.6.3 Teletrabajo (HIJO - evaluation)
│       calculatedScore = avg(A.6.1.score, A.6.2.score, A.6.3.score)
│
└── A.7 Seguridad RRHH (PADRE - weight=10)
    ├── A.7.1 Antes del empleo (HIJO - evaluation)
    ├── A.7.2 Durante el empleo (HIJO - evaluation)
    └── A.7.3 Cese o cambio (HIJO - evaluation)
        calculatedScore = avg(A.7.1.score, A.7.2.score, A.7.3.score)
```

**Reglas**:
1. ✅ **HIJOS** (A.5.1, A.5.2, etc.) → tienen **Evaluations**
2. ✅ **PADRES** (A.5, A.6, etc.) → tienen **StandardWeights**
3. ✅ **PADRES** calculan su score promediando scores de HIJOS
4. ✅ **Score Total** se calcula con pesos de PADRES

---

## Ejemplo Completo: Auditoría ISO 27001

### 1. Crear Auditoría
```typescript
const audit = {
  name: "Auditoría ISO 27001 - ACME Corp 2024",
  templateId: "uuid-iso27001",
  maturityFrameworkId: "uuid-cobit5",
  organizationId: "uuid-acme",
  auditType: AuditType.INICIAL,
  startDate: "2024-01-01",
  endDate: "2024-03-31",
  defaultExpectedLevelId: "uuid-nivel-3",  // Nivel 3 por defecto
  defaultTargetLevelId: "uuid-nivel-4"     // Nivel 4 objetivo
}
```

### 2. Configurar Pesos de Secciones
```typescript
// Crear pesos para las 11 secciones principales
const weights = [
  { auditId, standardId: "A.5-uuid",  weight: 10, totalControls: 2 },
  { auditId, standardId: "A.6-uuid",  weight: 15, totalControls: 3 },
  { auditId, standardId: "A.7-uuid",  weight: 10, totalControls: 3 },
  { auditId, standardId: "A.8-uuid",  weight: 15, totalControls: 10 },
  { auditId, standardId: "A.9-uuid",  weight: 15, totalControls: 14 },
  { auditId, standardId: "A.10-uuid", weight: 5,  totalControls: 2 },
  { auditId, standardId: "A.11-uuid", weight: 10, totalControls: 15 },
  { auditId, standardId: "A.12-uuid", weight: 10, totalControls: 25 },
  { auditId, standardId: "A.13-uuid", weight: 5,  totalControls: 7 },
  { auditId, standardId: "A.14-uuid", weight: 5,  totalControls: 13 },
  // ...
]
```

### 3. Evaluar Controles
```typescript
// Evaluar A.5.1 - Políticas de seguridad
const eval1 = {
  auditId,
  standardId: "A.5.1-uuid",
  expectedLevelId: "nivel-3-uuid",  // Definido
  obtainedLevelId: "nivel-2-uuid",  // Repetible
  targetLevelId: "nivel-4-uuid",    // Administrado
  score: 66.67,                      // 2/3 * 100
  gap: -2,                           // 4 - 2
  complianceStatus: "partial",
  evidence: "Existe política documentada aprobada por gerencia...",
  observations: "Política vigente desde 2023, requiere actualización...",
  recommendations: "1. Actualizar política con nuevas regulaciones...",
  evaluatedBy: "auditor-uuid",
  evaluatedAt: new Date()
}

// Evaluar A.5.2 - Revisión de políticas
const eval2 = {
  auditId,
  standardId: "A.5.2-uuid",
  expectedLevelId: "nivel-3-uuid",
  obtainedLevelId: "nivel-3-uuid",  // Cumple
  targetLevelId: "nivel-4-uuid",
  score: 100,
  gap: -1,
  complianceStatus: "compliant",
  evidence: "Existe procedimiento de revisión anual...",
  evaluatedBy: "auditor-uuid",
  evaluatedAt: new Date()
}
```

### 4. Calcular Score de Sección A.5
```typescript
// StandardWeight A.5
calculatedScore = avg(eval1.score, eval2.score)
                = avg(66.67, 100)
                = 83.34

evaluatedControls = 2  // de 2 totales
progress = 100%        // completado
```

### 5. Calcular Score Total
```typescript
// Después de evaluar todos los controles
Audit {
  totalScore = 85.58        // Score ponderado final
  complianceRate = 87.5     // 100 de 114 controles cumplen
  totalControls = 114
  evaluatedControls = 114
  progress = 100%
  isComplete = true
  isCompliant = true        // >= 75%
}
```

---

## Reportes Generados

### Resumen Ejecutivo
```
┌──────────────────────────────────────────────────────────────┐
│ AUDITORÍA ISO 27001 - ACME CORP 2024                         │
├──────────────────────────────────────────────────────────────┤
│ Score Total:        85.58%        ✅ CONFORME                │
│ Cumplimiento:       87.5%         (100/114 controles)        │
│ Framework:          COBIT 5                                  │
│ Período:            01/01/2024 - 31/03/2024                  │
├──────────────────────────────────────────────────────────────┤
│ Por Sección:                                                 │
│                                                              │
│ A.5  Políticas (10%)           83.3%  ████████░░  2/2       │
│ A.6  Organización (15%)        75.0%  ███████░░░  3/3       │
│ A.7  RRHH (10%)               90.0%  █████████░  3/3       │
│ A.8  Activos (15%)            80.0%  ████████░░  10/10     │
│ A.9  Acceso (15%)             92.0%  █████████▓  14/14     │
│ A.10 Criptografía (5%)        70.0%  ███████░░░  2/2       │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

### Detalle por Sección
```
A.5 POLÍTICAS DE SEGURIDAD DE LA INFORMACIÓN
Score: 83.3% | Peso: 10% | Controles: 2/2 evaluados

├─ A.5.1 Políticas de seguridad de la información
│  Score: 66.7% | ⚠️ CUMPLE PARCIALMENTE
│  Esperado: Nivel 3 (Definido) | Obtenido: Nivel 2 (Repetible)
│
│  Evidencia:
│  - Política documentada y aprobada por gerencia
│  - Política vigente desde junio 2023
│  - NO evidencia programa de capacitación formal
│
│  Recomendaciones:
│  1. Implementar programa de capacitación trimestral
│  2. Documentar evidencias de difusión de política
│  3. Establecer mecanismo de seguimiento de conocimiento
│
└─ A.5.2 Revisión de políticas
   Score: 100% | ✅ CUMPLE
   Esperado: Nivel 3 (Definido) | Obtenido: Nivel 3 (Definido)

   Evidencia:
   - Procedimiento de revisión anual documentado
   - Última revisión: diciembre 2023
   - Acta de revisión con aprobación de dirección
```

---

## Ventajas de esta Arquitectura

1. **Flexibilidad**: Cada auditoría define sus propios objetivos
2. **Escalabilidad**: Funciona con cualquier template (ISO 27001, ASFI, etc.)
3. **Personalización**: Pesos ajustables según industria/contexto
4. **Trazabilidad**: Todas las evaluaciones quedan documentadas
5. **Automatización**: Scores calculados automáticamente
6. **Agregación Simple**: Padres calculan promedio de hijos
7. **Reportes Ricos**: Información a nivel de control y sección

---

## Estado de Implementación

1. ✅ Entidades creadas (Audit, Evaluation, StandardWeight)
2. ✅ Migración de base de datos ejecutada
3. ✅ Repositorios con métodos especializados
4. ✅ **AuditScoringService** - con soporte para jerarquías multinivel recursivas
5. ✅ DTOs y validación completa
6. ✅ Casos de uso (create, update, evaluate, bulk weights, recalculate)
7. ✅ Controladores REST con Swagger
8. ✅ Módulo registrado en AppModule
9. ⏳ Seeders de ejemplo (próximo paso)
10. ⏳ Tests unitarios y e2e

---

## Casos de Uso Principales

1. **Crear Auditoría**: Configurar template, framework, organización
2. **Configurar Pesos**: Asignar ponderaciones a secciones
3. **Evaluar Control**: Registrar nivel obtenido y evidencias
4. **Calcular Scores**: Actualizar scores de secciones y total
5. **Generar Reportes**: Exportar resultados por sección/control
6. **Seguimiento**: Marcar controles para seguimiento posterior
