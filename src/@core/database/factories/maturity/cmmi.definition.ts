import type { MaturityFrameworkDefinition } from './cobit5.definition'

/**
 * CMMI (Capability Maturity Model Integration) Framework Definition
 *
 * Modelo de madurez para el desarrollo de procesos
 * Niveles: 1 (Inicial) a 5 (En optimización)
 */
export const CMMIFramework: MaturityFrameworkDefinition = {
  name: 'CMMI',
  code: 'cmmi',
  description:
    'Capability Maturity Model Integration. Modelo de mejora de procesos que proporciona un enfoque estructurado para mejorar los procesos organizacionales. Define 5 niveles de madurez (1-5).',
  minLevel: 1,
  maxLevel: 5,
  isActive: true,
  levels: [
    {
      level: 1,
      name: 'Inicial',
      shortName: 'Init',
      description:
        'Los procesos son impredecibles, pobremente controlados y reactivos. El trabajo se completa pero a menudo se retrasa y excede el presupuesto. El éxito depende de la competencia y heroísmo de las personas.',
      color: '#EF4444', // red-500
      icon: '🔴',
      recommendations: `
- Establecer procesos básicos de gestión de proyectos
- Documentar lecciones aprendidas
- Identificar procesos críticos que necesitan ser estabilizados
- Mejorar la estimación y planificación
- Crear conciencia sobre la importancia de los procesos
      `.trim(),
      observations: `
- Procesos ad-hoc e impredecibles
- Éxito basado en esfuerzos individuales
- Resultados inconsistentes
- Presupuestos y cronogramas frecuentemente excedidos
- Alta rotación de personal afecta gravemente
      `.trim(),
      order: 1,
    },
    {
      level: 2,
      name: 'Gestionado',
      shortName: 'Gest',
      description:
        'Los proyectos se planifican, realizan, miden y controlan. Los procesos están disciplinados a nivel de proyecto. La organización puede repetir éxitos previos en proyectos similares.',
      color: '#F59E0B', // amber-500
      icon: '🟡',
      recommendations: `
- Establecer biblioteca de procesos organizacionales
- Definir procesos estándar a nivel organizacional
- Implementar programa de capacitación formal
- Establecer métricas organizacionales
- Preparar infraestructura para nivel 3
      `.trim(),
      observations: `
- Requisitos gestionados y trazables
- Planificación de proyectos formal
- Seguimiento y control establecidos
- Gestión de configuración presente
- Aseguramiento de calidad básico implementado
      `.trim(),
      order: 2,
      isMinimumAcceptable: true,
    },
    {
      level: 3,
      name: 'Definido',
      shortName: 'Def',
      description:
        'Los procesos están bien caracterizados, entendidos y descritos en estándares, procedimientos, herramientas y métodos. Los proyectos adaptan los procesos estándar de la organización.',
      color: '#EAB308', // yellow-500
      icon: '🟡',
      recommendations: `
- Establecer repositorio de métricas organizacionales
- Implementar programa de gestión cuantitativa
- Definir objetivos de calidad y rendimiento
- Establecer capacidades de análisis estadístico
- Preparar para gestión cuantitativa (nivel 4)
      `.trim(),
      observations: `
- Conjunto de procesos estándar organizacionales
- Procesos adaptados de estándares organizacionales
- Programa de capacitación establecido
- Repositorio de activos de proceso
- Gestión integrada de proyectos
      `.trim(),
      order: 3,
    },
    {
      level: 4,
      name: 'Gestionado Cuantitativamente',
      shortName: 'Cuant',
      description:
        'Los procesos se controlan usando técnicas estadísticas y cuantitativas. La calidad y el rendimiento del proceso se entienden en términos estadísticos y se gestionan durante todo el ciclo de vida del proyecto.',
      color: '#10B981', // green-500
      icon: '🟢',
      recommendations: `
- Identificar causas raíz de defectos
- Implementar prevención de defectos
- Establecer innovación organizacional
- Preparar para optimización continua (nivel 5)
- Fomentar cultura de mejora continua
      `.trim(),
      observations: `
- Objetivos cuantitativos de calidad y rendimiento
- Procesos estables y predecibles
- Control estadístico de procesos
- Variabilidad del proceso entendida
- Decisiones basadas en datos objetivos
      `.trim(),
      order: 4,
    },
    {
      level: 5,
      name: 'En Optimización',
      shortName: 'Opt',
      description:
        'La organización se enfoca en la mejora continua del rendimiento del proceso mediante mejoras incrementales e innovadoras. Los procesos se mejoran continuamente basándose en una comprensión cuantitativa de las causas de variación.',
      color: '#22C55E', // green-400
      icon: '⭐',
      recommendations: `
- Mantener cultura de innovación continua
- Realizar benchmarking constante con la industria
- Adoptar mejores prácticas y tecnologías emergentes
- Compartir conocimiento dentro y fuera de la organización
- Influenciar estándares de la industria
      `.trim(),
      observations: `
- Mejora continua institucionalizada
- Análisis de causas raíz sistemático
- Prevención de defectos proactiva
- Gestión de cambios tecnológicos efectiva
- Organización de alto rendimiento y aprendizaje continuo
      `.trim(),
      order: 5,
      isTarget: true,
    },
  ],
}
