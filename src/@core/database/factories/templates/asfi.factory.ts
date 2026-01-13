import { TemplateStatus } from '../../../../modules/templates/constants/template-status.enum'
import type { TemplateDefinition } from './iso27001.factory'

/**
 * ASFI Factory
 *
 * Autoridad de Supervisión del Sistema Financiero (Bolivia)
 * Recopilación de Normas para Servicios Financieros
 *
 * Estructura basada en las normas de ASFI para entidades financieras
 */
export const ASFITemplate: TemplateDefinition = {
  name: 'ASFI',
  description:
    'Recopilación de Normas para Servicios Financieros - Autoridad de Supervisión del Sistema Financiero (Bolivia)',
  version: 'v2024',
  status: TemplateStatus.PUBLISHED,
  standards: [
    // TÍTULO I - NORMATIVA DEL SISTEMA FINANCIERO
    {
      code: '1',
      title: 'NORMATIVA DEL SISTEMA FINANCIERO',
      description:
        'Normas aplicables a las entidades de intermediación financiera',
      order: 1,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: '1.1',
      title: 'Gestión y Administración de Riesgos',
      description: null,
      order: 1,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.1.1',
      title: 'Riesgo de Crédito',
      description:
        'Gestión integral del riesgo de crédito: políticas, procedimientos, límites, seguimiento y control',
      order: 1,
      level: 3,
      parentCode: '1.1',
      isAuditable: true,
    },
    {
      code: '1.1.2',
      title: 'Riesgo de Mercado',
      description:
        'Gestión del riesgo de mercado: identificación, medición, control y monitoreo',
      order: 2,
      level: 3,
      parentCode: '1.1',
      isAuditable: true,
    },
    {
      code: '1.1.3',
      title: 'Riesgo de Liquidez',
      description:
        'Gestión del riesgo de liquidez: medición, límites, planes de contingencia',
      order: 3,
      level: 3,
      parentCode: '1.1',
      isAuditable: true,
    },
    {
      code: '1.1.4',
      title: 'Riesgo Operacional',
      description:
        'Gestión del riesgo operacional: identificación, evaluación, control, monitoreo y mitigación',
      order: 4,
      level: 3,
      parentCode: '1.1',
      isAuditable: true,
    },
    {
      code: '1.1.5',
      title: 'Riesgo Legal',
      description:
        'Gestión del riesgo legal: cumplimiento normativo, contratos, litigios',
      order: 5,
      level: 3,
      parentCode: '1.1',
      isAuditable: true,
    },

    // 1.2 - Gobierno Corporativo
    {
      code: '1.2',
      title: 'Gobierno Corporativo',
      description: null,
      order: 2,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.2.1',
      title: 'Directorio y Alta Gerencia',
      description:
        'Funciones, responsabilidades y requisitos del Directorio y Alta Gerencia',
      order: 1,
      level: 3,
      parentCode: '1.2',
      isAuditable: true,
    },
    {
      code: '1.2.2',
      title: 'Comités',
      description:
        'Conformación y funcionamiento de comités (Auditoría, Riesgos, etc.)',
      order: 2,
      level: 3,
      parentCode: '1.2',
      isAuditable: true,
    },
    {
      code: '1.2.3',
      title: 'Código de Ética',
      description:
        'Código de Ética y Conducta: principios, valores, conflictos de interés',
      order: 3,
      level: 3,
      parentCode: '1.2',
      isAuditable: true,
    },

    // 1.3 - Auditoría Interna
    {
      code: '1.3',
      title: 'Auditoría Interna',
      description: null,
      order: 3,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.3.1',
      title: 'Organización y Funciones',
      description:
        'Organización, independencia, objetivos y alcance de Auditoría Interna',
      order: 1,
      level: 3,
      parentCode: '1.3',
      isAuditable: true,
    },
    {
      code: '1.3.2',
      title: 'Plan de Auditoría',
      description:
        'Plan anual de auditoría basado en riesgos, ejecución y seguimiento',
      order: 2,
      level: 3,
      parentCode: '1.3',
      isAuditable: true,
    },

    // 1.4 - Seguridad de la Información
    {
      code: '1.4',
      title: 'Seguridad de la Información',
      description: null,
      order: 4,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.4.1',
      title: 'Políticas de Seguridad',
      description: 'Políticas y procedimientos de seguridad de la información',
      order: 1,
      level: 3,
      parentCode: '1.4',
      isAuditable: true,
    },
    {
      code: '1.4.2',
      title: 'Controles de Acceso',
      description:
        'Controles de acceso físico y lógico a sistemas e información',
      order: 2,
      level: 3,
      parentCode: '1.4',
      isAuditable: true,
    },
    {
      code: '1.4.3',
      title: 'Continuidad del Negocio',
      description:
        'Plan de Continuidad del Negocio y Plan de Recuperación ante Desastres',
      order: 3,
      level: 3,
      parentCode: '1.4',
      isAuditable: true,
    },
    {
      code: '1.4.4',
      title: 'Ciberseguridad',
      description:
        'Controles de ciberseguridad: prevención, detección y respuesta a incidentes',
      order: 4,
      level: 3,
      parentCode: '1.4',
      isAuditable: true,
    },

    // 1.5 - Prevención de Lavado de Dinero
    {
      code: '1.5',
      title: 'Prevención de Lavado de Dinero y Financiamiento del Terrorismo',
      description: null,
      order: 5,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.5.1',
      title: 'Conocimiento del Cliente (KYC)',
      description:
        'Políticas y procedimientos de identificación y debida diligencia del cliente',
      order: 1,
      level: 3,
      parentCode: '1.5',
      isAuditable: true,
    },
    {
      code: '1.5.2',
      title: 'Monitoreo de Operaciones',
      description:
        'Monitoreo y detección de operaciones inusuales y sospechosas',
      order: 2,
      level: 3,
      parentCode: '1.5',
      isAuditable: true,
    },
    {
      code: '1.5.3',
      title: 'Reporte de Operaciones Sospechosas',
      description:
        'Procedimientos de reporte de operaciones sospechosas a la UIF-Bolivia',
      order: 3,
      level: 3,
      parentCode: '1.5',
      isAuditable: true,
    },

    // 1.6 - Protección al Consumidor Financiero
    {
      code: '1.6',
      title: 'Protección al Consumidor Financiero',
      description: null,
      order: 6,
      level: 2,
      parentCode: '1',
      isAuditable: false,
    },
    {
      code: '1.6.1',
      title: 'Transparencia de Información',
      description:
        'Transparencia en la información de productos y servicios financieros',
      order: 1,
      level: 3,
      parentCode: '1.6',
      isAuditable: true,
    },
    {
      code: '1.6.2',
      title: 'Atención de Reclamos',
      description:
        'Sistema de atención de reclamos y quejas de consumidores financieros',
      order: 2,
      level: 3,
      parentCode: '1.6',
      isAuditable: true,
    },

    // TÍTULO II - NORMATIVA DE SEGUROS
    {
      code: '2',
      title: 'NORMATIVA DE SEGUROS',
      description: 'Normas aplicables a las entidades aseguradoras',
      order: 2,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: '2.1',
      title: 'Gestión de Riesgos Técnicos',
      description: null,
      order: 1,
      level: 2,
      parentCode: '2',
      isAuditable: false,
    },
    {
      code: '2.1.1',
      title: 'Riesgo de Suscripción',
      description:
        'Gestión del riesgo de suscripción: selección, tarificación, reaseguro',
      order: 1,
      level: 3,
      parentCode: '2.1',
      isAuditable: true,
    },
    {
      code: '2.1.2',
      title: 'Reservas Técnicas',
      description: 'Constitución y gestión de reservas técnicas adecuadas',
      order: 2,
      level: 3,
      parentCode: '2.1',
      isAuditable: true,
    },

    // Puedes continuar agregando más normas...
    // Este es un ejemplo representativo de la estructura ASFI
  ],
}
