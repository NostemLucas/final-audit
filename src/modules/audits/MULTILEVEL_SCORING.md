# Sistema de Ponderación Multinivel

## Problema: Jerarquías Complejas

Las normas como ISO 27001, COBIT, NIST, etc., tienen jerarquías de 3-4 niveles de profundidad:

```
ISO 27001 Anexo A (estructura real)
│
├── A.5 Políticas de Seguridad (nivel 1 - SECCIÓN)
│   ├── A.5.1 Dirección de gestión (nivel 2 - SUBSECCIÓN)
│   │   ├── A.5.1.1 Políticas para SI (nivel 3 - CONTROL EVALUABLE)
│   │   └── A.5.1.2 Revisión de políticas (nivel 3 - CONTROL EVALUABLE)
│   └── A.5.2 Roles y responsabilidades (nivel 2 - SUBSECCIÓN)
│       └── A.5.2.1 Asignación responsabilidades (nivel 3 - CONTROL EVALUABLE)
│
├── A.8 Gestión de Activos (nivel 1 - SECCIÓN)
│   ├── A.8.1 Responsabilidad activos (nivel 2 - SUBSECCIÓN)
│   │   ├── A.8.1.1 Inventario (nivel 3 - CONTROL EVALUABLE)
│   │   └── A.8.1.2 Propiedad (nivel 3 - CONTROL EVALUABLE)
│   ├── A.8.2 Clasificación (nivel 2 - SUBSECCIÓN)
│   │   └── A.8.2.1 Clasificación información (nivel 3 - CONTROL EVALUABLE)
│   └── A.8.3 Manejo de medios (nivel 2 - SUBSECCIÓN)
│       ├── A.8.3.1 Medios removibles (nivel 3 - CONTROL EVALUABLE)
│       └── A.8.3.2 Disposición (nivel 3 - CONTROL EVALUABLE)
```

O incluso 4 niveles:
```
NIST/COBIT
│
├── 4 Planificar y Organizar (nivel 1)
│   ├── 4.1 Definir plan estratégico TI (nivel 2)
│   │   ├── 4.1.1 Alineación estratégica (nivel 3)
│   │   │   ├── 4.1.1.1 Marco referencia (nivel 4 - CONTROL EVALUABLE)
│   │   │   └── 4.1.1.2 Revisión estratégica (nivel 4 - CONTROL EVALUABLE)
│   │   └── 4.1.2 Cadena de valor (nivel 3)
│   │       └── 4.1.2.1 Mapeo procesos (nivel 4 - CONTROL EVALUABLE)
```

---

## Solución: Cálculo Recursivo de Scores

### Reglas de Ponderación

1. **Solo el nivel superior (nivel 1) tiene pesos**
   - Se crean `StandardWeight` solo para secciones principales (A.5, A.8, etc.)
   - Los pesos deben sumar **100%**

2. **Niveles intermedios NO tienen peso**
   - Las subsecciones (A.5.1, A.5.2, A.8.1, etc.) NO tienen `StandardWeight`
   - Su score se calcula automáticamente como **promedio de sus hijos**

3. **Controles evaluables (hojas) tienen evaluations**
   - Solo los nodos con `isAuditable = true` se pueden evaluar
   - Tienen `Evaluation` con score calculado según madurez

4. **Cálculo recursivo de abajo hacia arriba**
   - Primero se calculan los scores de los controles (hojas)
   - Luego se promedian hacia arriba nivel por nivel
   - Finalmente se pondera el nivel superior

---

## Ejemplo Completo: ISO 27001

### Paso 1: Crear Auditoría

```typescript
POST /audits
{
  "name": "Auditoría ISO 27001 - ACME Corp 2024",
  "templateId": "uuid-iso27001",
  "maturityFrameworkId": "uuid-cobit5",
  "organizationId": "uuid-acme",
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "defaultExpectedLevelId": "uuid-nivel-3",
  "defaultTargetLevelId": "uuid-nivel-4"
}
```

**Resultado:**
- Se crea el `Audit`
- Se crean `StandardWeight` para secciones nivel 1:
  ```
  A.5  → weight: 9.09%   (100 / 11 secciones)
  A.6  → weight: 9.09%
  A.7  → weight: 9.09%
  A.8  → weight: 9.09%
  ... (11 secciones en total)
  ```
- Cada `StandardWeight` tiene `totalControls` calculado recursivamente:
  ```
  A.5.totalControls = 3  (A.5.1.1, A.5.1.2, A.5.2.1)
  A.8.totalControls = 5  (todos los controles bajo A.8)
  ```

### Paso 2: Configurar Pesos (Opcional)

Si quieres ajustar los pesos según importancia:

```typescript
POST /standard-weights/bulk
{
  "auditId": "uuid-audit",
  "weights": [
    { "standardId": "A.5-uuid", "weight": 10 },
    { "standardId": "A.6-uuid", "weight": 12 },
    { "standardId": "A.7-uuid", "weight": 8 },
    { "standardId": "A.8-uuid", "weight": 15 },
    { "standardId": "A.9-uuid", "weight": 15 },
    { "standardId": "A.10-uuid", "weight": 5 },
    { "standardId": "A.11-uuid", "weight": 10 },
    { "standardId": "A.12-uuid", "weight": 10 },
    { "standardId": "A.13-uuid", "weight": 5 },
    { "standardId": "A.14-uuid", "weight": 5 },
    { "standardId": "A.15-uuid", "weight": 5 }
  ]
}
```

El sistema valida que sumen 100%.

### Paso 3: Evaluar Controles

Evaluamos solo los **controles evaluables** (hojas del árbol):

```typescript
// Evaluar A.5.1.1 - Políticas para seguridad de la información
POST /evaluations
{
  "auditId": "uuid-audit",
  "standardId": "A.5.1.1-uuid",
  "expectedLevelId": "nivel-3-uuid",  // Definido
  "obtainedLevelId": "nivel-2-uuid",  // Repetible
  "targetLevelId": "nivel-4-uuid",    // Administrado
  "evidence": "Existe política documentada aprobada por gerencia...",
  "observations": "La política está vigente desde 2023...",
  "recommendations": "1. Actualizar según ISO 27001:2022..."
}

// Resultado automático:
{
  "score": 66.67,        // 2/3 * 100
  "gap": -2,             // 4 - 2
  "complianceStatus": "partial"
}
```

```typescript
// Evaluar A.5.1.2 - Revisión de políticas
POST /evaluations
{
  "auditId": "uuid-audit",
  "standardId": "A.5.1.2-uuid",
  "expectedLevelId": "nivel-3-uuid",
  "obtainedLevelId": "nivel-3-uuid",  // Cumple
  "targetLevelId": "nivel-4-uuid",
  "evidence": "Existe procedimiento de revisión anual..."
}

// Resultado:
{
  "score": 100,          // 3/3 * 100
  "gap": -1,             // 4 - 3
  "complianceStatus": "compliant"
}
```

```typescript
// Evaluar A.5.2.1 - Asignación de responsabilidades
POST /evaluations
{
  "auditId": "uuid-audit",
  "standardId": "A.5.2.1-uuid",
  "expectedLevelId": "nivel-3-uuid",
  "obtainedLevelId": "nivel-3-uuid",
  "targetLevelId": "nivel-4-uuid",
  "evidence": "Roles documentados en organigrama..."
}

// Resultado:
{
  "score": 100,
  "gap": -1,
  "complianceStatus": "compliant"
}
```

### Paso 4: Cálculo Automático de Scores

Después de cada evaluación, el sistema recalcula automáticamente:

#### Nivel 3 → Evaluaciones de controles
```
A.5.1.1.score = 66.67
A.5.1.2.score = 100
A.5.2.1.score = 100
```

#### Nivel 2 → Subsecciones (promedio recursivo)
```typescript
// AuditScoringService.calculateSectionScore("A.5.1")
A.5.1.calculatedScore = avg(
  A.5.1.1.score,  // 66.67
  A.5.1.2.score   // 100
) = 83.34

// AuditScoringService.calculateSectionScore("A.5.2")
A.5.2.calculatedScore = avg(
  A.5.2.1.score   // 100
) = 100
```

#### Nivel 1 → Sección principal (promedio de subsecciones)
```typescript
// AuditScoringService.calculateSectionScore("A.5")
A.5.calculatedScore = avg(
  A.5.1.calculatedScore,  // 83.34
  A.5.2.calculatedScore   // 100
) = 91.67

// StandardWeight actualizado:
StandardWeight A.5 {
  weight: 10,
  calculatedScore: 91.67,
  totalControls: 3,
  evaluatedControls: 3
}
```

#### Nivel 0 → Score Total (ponderado)
```typescript
// AuditScoringService.calculateTotalScore()

// Obtener todos los StandardWeight
weights = [
  { section: "A.5",  score: 91.67, weight: 10 },
  { section: "A.6",  score: 85.00, weight: 12 },
  { section: "A.7",  score: 92.00, weight: 8 },
  { section: "A.8",  score: 88.50, weight: 15 },
  // ... resto de secciones
]

// Calcular score ponderado
weightedSum = (91.67 * 10) + (85.00 * 12) + (92.00 * 8) + (88.50 * 15) + ...
            = 916.7 + 1020 + 736 + 1327.5 + ...
            = 8875

totalScore = weightedSum / 100 = 88.75%

// Audit actualizado:
Audit {
  totalScore: 88.75,
  complianceRate: 87.5,      // (100 de 114 cumplen)
  evaluatedControls: 114,
  totalControls: 114
}
```

---

## Flujo de Cálculo en el Código

### Cuando se crea/actualiza una evaluación

```typescript
CreateEvaluationUseCase.execute(dto)
  ├─ 1. Guardar evaluación
  ├─ 2. Calcular score y gap del control
  │     └─ evaluation.score = (obtained / expected) * 100
  ├─ 3. Buscar el padre del control (ej: A.5.1.1 → padre = A.5.1)
  ├─ 4. Buscar el abuelo (ej: A.5.1 → padre = A.5)
  ├─ 5. Recalcular score del abuelo (nivel 1)
  │     └─ AuditScoringService.recalculateSectionScore("A.5")
  │           └─ calculateSectionScore("A.5") [RECURSIVO]
  │                 ├─ Obtener hijos directos: [A.5.1, A.5.2]
  │                 ├─ Para A.5.1 (no evaluable):
  │                 │     └─ calculateSectionScore("A.5.1") [RECURSIÓN]
  │                 │           ├─ Obtener hijos: [A.5.1.1, A.5.1.2]
  │                 │           ├─ Obtener evaluations
  │                 │           └─ avg(66.67, 100) = 83.34
  │                 ├─ Para A.5.2 (no evaluable):
  │                 │     └─ calculateSectionScore("A.5.2") [RECURSIÓN]
  │                 │           └─ avg(100) = 100
  │                 └─ avg(83.34, 100) = 91.67
  └─ 6. Recalcular score total de la auditoría
        └─ AuditScoringService.recalculateAuditScores(auditId)
              ├─ Recalcular todas las secciones (A.5, A.6, ...)
              ├─ Calcular score ponderado
              └─ Actualizar audit.totalScore
```

---

## Ventajas del Diseño

1. **Soporta jerarquías de cualquier profundidad**
   - 2 niveles: A.5 → A.5.1
   - 3 niveles: A.5 → A.5.1 → A.5.1.1
   - 4 niveles: 4 → 4.1 → 4.1.1 → 4.1.1.1
   - N niveles: funciona igual

2. **Ponderación simple**
   - Solo configuras pesos para el nivel superior
   - Los niveles intermedios se calculan automáticamente

3. **Flexible**
   - Puedes ajustar pesos según contexto/industria
   - Puedes usar `manualScore` para overrides justificados

4. **Automático**
   - Cada evaluación recalcula todo hacia arriba
   - No hay inconsistencias

5. **Trazable**
   - Puedes ver el score de cualquier nivel
   - Puedes hacer drill-down desde A.5 → A.5.1 → A.5.1.1

---

## Endpoints Útiles

### Ver progreso por sección
```http
GET /standard-weights/progress?auditId=xxx
```

Retorna:
```json
[
  {
    "standardCode": "A.5",
    "standardName": "Políticas de Seguridad",
    "weight": 10,
    "finalScore": 91.67,
    "evaluatedControls": 3,
    "totalControls": 3,
    "progress": 100
  },
  {
    "standardCode": "A.8",
    "standardName": "Gestión de Activos",
    "weight": 15,
    "finalScore": 88.50,
    "evaluatedControls": 4,
    "totalControls": 5,
    "progress": 80
  }
]
```

### Validar que los pesos sumen 100%
```http
GET /standard-weights/validate?auditId=xxx
```

Retorna:
```json
{
  "isValid": true,
  "totalWeight": 100,
  "difference": 0
}
```

### Forzar recálculo completo
```http
POST /audits/:id/recalculate-scores
```

---

## Casos Especiales

### Control sin evaluación
Si un control no tiene evaluación, **no se cuenta** en el promedio:

```
A.5.1 tiene 3 hijos:
- A.5.1.1: score = 100
- A.5.1.2: SIN EVALUACIÓN
- A.5.1.3: score = 80

A.5.1.calculatedScore = avg(100, 80) = 90  ← solo 2 controles
```

### Subsección sin controles evaluados
Si una subsección no tiene ningún control evaluado, retorna `0` y **no se cuenta**:

```
A.5 tiene 2 hijos:
- A.5.1: calculatedScore = 85
- A.5.2: calculatedScore = 0 (sin evaluaciones)

A.5.calculatedScore = avg(85) = 85  ← solo A.5.1
```

### Override manual con `manualScore`
Puedes overridear el score calculado con justificación:

```typescript
PUT /standard-weights/:id
{
  "manualScore": 75,
  "manualScoreJustification": "Aunque los controles cumplen individualmente, existen debilidades sistémicas en la integración entre procesos..."
}
```

El campo `finalScore` (virtual) retorna `manualScore ?? calculatedScore`.

---

## Conclusión

El sistema soporta **jerarquías multinivel** mediante:
1. **Ponderación** solo en nivel superior
2. **Cálculo recursivo** de scores de abajo hacia arriba
3. **Promedio automático** en niveles intermedios
4. **Actualización automática** en cascada

Esto funciona para **cualquier norma**:
- ISO 27001 (3 niveles)
- NIST (4+ niveles)
- COBIT (3-4 niveles)
- ASFI (2-3 niveles)
- O cualquier jerarquía personalizada
