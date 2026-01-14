/**
 * COBIT 5 Maturity Framework Definition
 *
 * Framework de gobierno y gestión de TI empresarial
 * Niveles: 0 (Inexistente) a 5 (Optimizado)
 */

export interface MaturityLevelDefinition {
  level: number
  name: string
  shortName: string
  description: string
  color: string
  icon: string
  recommendations: string
  observations: string
  order: number
  isMinimumAcceptable?: boolean
  isTarget?: boolean
}

export interface MaturityFrameworkDefinition {
  name: string
  code: string
  description: string
  minLevel: number
  maxLevel: number
  isActive: boolean
  levels: MaturityLevelDefinition[]
}

/**
 * COBIT 5 Framework Completo
 */
export const COBIT5Framework: MaturityFrameworkDefinition = {
  name: 'COBIT 5',
  code: 'cobit5',
  description:
    'Framework de gobierno y gestión de TI empresarial. Define 6 niveles de madurez (0-5) para evaluar la capacidad de los procesos de TI.',
  minLevel: 0,
  maxLevel: 5,
  isActive: true,
  levels: [
    {
      level: 0,
      name: 'Inexistente',
      shortName: 'N/A',
      description:
        'No existe proceso alguno. La organización no ha reconocido que existe un problema a resolver. No hay procesos identificados ni actividades coordinadas.',
      color: '#DC2626', // red-600
      icon: '🔴',
      recommendations: `
- Iniciar el reconocimiento de la necesidad del proceso
- Realizar evaluación inicial de capacidades actuales
- Identificar áreas críticas que requieren procesos formales
- Establecer comunicación sobre la importancia de los procesos
      `.trim(),
      observations: `
- Falta total de procesos documentados o reconocidos
- No hay conciencia del problema
- Resultados impredecibles
- Alto riesgo organizacional
      `.trim(),
      order: 0,
    },
    {
      level: 1,
      name: 'Inicial',
      shortName: 'Init',
      description:
        'Los procesos son ad-hoc y desorganizados. El éxito depende de esfuerzos individuales y heroicos. No hay procesos estándares. La organización reconoce que existen problemas pero no hay procesos formalizados.',
      color: '#EF4444', // red-500
      icon: '🟠',
      recommendations: `
- Documentar procesos informales existentes
- Identificar personas clave y sus conocimientos
- Comenzar a estandarizar prácticas exitosas
- Establecer comunicación básica entre áreas
- Definir responsabilidades iniciales
      `.trim(),
      observations: `
- Procesos informales y no repetibles
- Dependen de individuos clave ("héroes")
- No hay documentación formal
- Resultados inconsistentes
- Alta dependencia del conocimiento tácito
      `.trim(),
      order: 1,
    },
    {
      level: 2,
      name: 'Repetible',
      shortName: 'Rep',
      description:
        'Los procesos siguen patrones regulares. Hay suficiente disciplina para repetir procedimientos anteriores con éxito. Los procesos se desarrollan hasta la etapa donde diferentes personas que realizan la misma tarea siguen procedimientos similares.',
      color: '#F59E0B', // amber-500
      icon: '🟡',
      recommendations: `
- Formalizar y documentar procesos repetibles
- Capacitar al personal en procedimientos establecidos
- Establecer métricas básicas de rendimiento
- Implementar seguimiento de actividades clave
- Definir roles y responsabilidades claras
      `.trim(),
      observations: `
- Procesos intuitivos que se pueden repetir
- No están formalmente documentados en todos los casos
- Disciplina básica presente
- Resultados más predecibles que nivel 1
- Dependencia moderada de individuos específicos
      `.trim(),
      order: 2,
      isMinimumAcceptable: true, // Típicamente el mínimo aceptable en muchas organizaciones
    },
    {
      level: 3,
      name: 'Definido',
      shortName: 'Def',
      description:
        'Los procesos están documentados, estandarizados e integrados en toda la organización. Los procedimientos han sido establecidos, documentados y comunicados mediante capacitación. Es obligatorio que estos procesos se sigan.',
      color: '#EAB308', // yellow-500
      icon: '🟡',
      recommendations: `
- Implementar métricas de rendimiento y KPIs
- Establecer monitoreo continuo de procesos
- Crear planes de mejora continua
- Integrar procesos con otras áreas
- Automatizar donde sea posible
      `.trim(),
      observations: `
- Procesos documentados y comunicados
- Capacitación formal establecida
- Procedimientos obligatorios
- Mayor consistencia en resultados
- Procesos integrados en la cultura organizacional
      `.trim(),
      order: 3,
    },
    {
      level: 4,
      name: 'Administrado',
      shortName: 'Adm',
      description:
        'Los procesos se monitorean y miden para cumplir objetivos individuales. El desempeño de los procesos se mide, controla y mantiene dentro de límites aceptables. Los procesos están bajo constante mejora.',
      color: '#10B981', // green-500
      icon: '🟢',
      recommendations: `
- Implementar mejora continua basada en datos
- Establecer benchmarking con mejores prácticas
- Automatizar reportería y análisis
- Optimizar procesos basándose en métricas
- Prepararse para optimización (nivel 5)
      `.trim(),
      observations: `
- Procesos medidos y monitoreados continuamente
- KPIs claramente definidos y seguidos
- Desviaciones detectadas y corregidas proactivamente
- Mejora continua institucionalizada
- Alta eficiencia operacional
      `.trim(),
      order: 4,
    },
    {
      level: 5,
      name: 'Optimizado',
      shortName: 'Opt',
      description:
        'Los procesos están en mejora continua basada en innovación y mejores prácticas. La organización usa la información para adaptarse rápidamente. Los procesos se optimizan continuamente usando tecnologías innovadoras.',
      color: '#22C55E', // green-400
      icon: '⭐',
      recommendations: `
- Mantener innovación continua
- Realizar benchmark constante con la industria
- Adoptar tecnologías emergentes estratégicamente
- Fomentar cultura de mejora e innovación
- Compartir mejores prácticas interna y externamente
      `.trim(),
      observations: `
- Mejora continua e innovación constante
- Uso de tecnologías avanzadas y emergentes
- Organización ágil y adaptable
- Referente en la industria
- Cultura de excelencia operacional
      `.trim(),
      order: 5,
      isTarget: true, // Este es típicamente el objetivo/meta
    },
  ],
}
