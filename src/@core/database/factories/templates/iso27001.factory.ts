import { TemplateStatus } from '../../../../modules/templates/constants/template-status.enum'

/**
 * ISO 27001:2013 Factory
 *
 * Define la estructura de la plantilla ISO 27001:2013
 * con sus controles del Anexo A
 */

export interface StandardDefinition {
  code: string
  title: string
  description: string | null
  order: number
  level: number
  parentCode: string | null
  isAuditable: boolean
}

export interface TemplateDefinition {
  name: string
  description: string
  version: string
  status: TemplateStatus
  standards: StandardDefinition[]
}

/**
 * Plantilla ISO 27001:2013 - Anexo A
 *
 * Controles de seguridad de la información
 */
export const ISO27001Template: TemplateDefinition = {
  name: 'ISO 27001',
  description:
    'Sistema de Gestión de Seguridad de la Información - Anexo A: Controles de Seguridad',
  version: 'v2013',
  status: TemplateStatus.PUBLISHED,
  standards: [
    // A.5 - Políticas de seguridad de la información
    {
      code: 'A.5',
      title: 'Políticas de seguridad de la información',
      description:
        'Directrices de la dirección para orientar y dar soporte a la gestión de la seguridad de la información',
      order: 1,
      level: 1,
      parentCode: null,
      isAuditable: false, // Agrupador
    },
    {
      code: 'A.5.1',
      title: 'Directrices de la dirección para la seguridad de la información',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.5',
      isAuditable: false,
    },
    {
      code: 'A.5.1.1',
      title: 'Políticas para la seguridad de la información',
      description:
        'Se debe definir un conjunto de políticas para la seguridad de la información, aprobado por la dirección, publicado y comunicado a los empleados y partes externas relevantes',
      order: 1,
      level: 3,
      parentCode: 'A.5.1',
      isAuditable: true,
    },
    {
      code: 'A.5.1.2',
      title: 'Revisión de las políticas para la seguridad de la información',
      description:
        'Las políticas para la seguridad de la información se deben revisar a intervalos planificados o si ocurren cambios significativos',
      order: 2,
      level: 3,
      parentCode: 'A.5.1',
      isAuditable: true,
    },

    // A.6 - Organización de la seguridad de la información
    {
      code: 'A.6',
      title: 'Organización de la seguridad de la información',
      description:
        'Establecer un marco de gestión para iniciar y controlar la implementación y operación de la seguridad de la información',
      order: 2,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: 'A.6.1',
      title: 'Organización interna',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.6',
      isAuditable: false,
    },
    {
      code: 'A.6.1.1',
      title: 'Roles y responsabilidades para la seguridad de la información',
      description:
        'Se deben definir y asignar todas las responsabilidades de la seguridad de la información',
      order: 1,
      level: 3,
      parentCode: 'A.6.1',
      isAuditable: true,
    },
    {
      code: 'A.6.1.2',
      title: 'Segregación de tareas',
      description:
        'Los deberes y áreas de responsabilidad en conflicto se deben segregar para reducir las posibilidades de modificación no autorizada o no intencional',
      order: 2,
      level: 3,
      parentCode: 'A.6.1',
      isAuditable: true,
    },

    // A.7 - Seguridad de los recursos humanos
    {
      code: 'A.7',
      title: 'Seguridad de los recursos humanos',
      description:
        'Asegurar que los empleados y contratistas entienden sus responsabilidades y son idóneos para los roles',
      order: 3,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: 'A.7.1',
      title: 'Antes de la contratación',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.7',
      isAuditable: false,
    },
    {
      code: 'A.7.1.1',
      title: 'Selección',
      description:
        'Las verificaciones de los antecedentes de todos los candidatos a un empleo se deben llevar a cabo de acuerdo con las leyes, reglamentos y ética pertinentes',
      order: 1,
      level: 3,
      parentCode: 'A.7.1',
      isAuditable: true,
    },
    {
      code: 'A.7.1.2',
      title: 'Términos y condiciones de contratación',
      description:
        'Los acuerdos contractuales con empleados y contratistas deben establecer sus responsabilidades y las de la organización para la seguridad de la información',
      order: 2,
      level: 3,
      parentCode: 'A.7.1',
      isAuditable: true,
    },

    // A.8 - Gestión de activos
    {
      code: 'A.8',
      title: 'Gestión de activos',
      description:
        'Identificar los activos de la organización y definir las responsabilidades de protección apropiadas',
      order: 4,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: 'A.8.1',
      title: 'Responsabilidad sobre los activos',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.8',
      isAuditable: false,
    },
    {
      code: 'A.8.1.1',
      title: 'Inventario de activos',
      description:
        'Los activos asociados con información e instalaciones de procesamiento de información se deben identificar y se debe elaborar y mantener un inventario de estos activos',
      order: 1,
      level: 3,
      parentCode: 'A.8.1',
      isAuditable: true,
    },
    {
      code: 'A.8.1.2',
      title: 'Propiedad de los activos',
      description:
        'Los activos mantenidos en el inventario deben tener un propietario',
      order: 2,
      level: 3,
      parentCode: 'A.8.1',
      isAuditable: true,
    },

    // A.9 - Control de acceso
    {
      code: 'A.9',
      title: 'Control de acceso',
      description:
        'Limitar el acceso a la información y a las instalaciones de procesamiento de información',
      order: 5,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: 'A.9.1',
      title: 'Requisitos del negocio para el control de acceso',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.9',
      isAuditable: false,
    },
    {
      code: 'A.9.1.1',
      title: 'Política de control de acceso',
      description:
        'Se debe establecer, documentar y revisar una política de control de acceso con base en los requisitos del negocio y de seguridad de la información',
      order: 1,
      level: 3,
      parentCode: 'A.9.1',
      isAuditable: true,
    },
    {
      code: 'A.9.1.2',
      title: 'Acceso a redes y servicios en red',
      description:
        'Los usuarios solo deben tener acceso a la red y a los servicios de red que se les ha autorizado específicamente usar',
      order: 2,
      level: 3,
      parentCode: 'A.9.1',
      isAuditable: true,
    },

    // A.10 - Criptografía
    {
      code: 'A.10',
      title: 'Criptografía',
      description:
        'Asegurar el uso apropiado y eficaz de la criptografía para proteger la confidencialidad, autenticidad e integridad de la información',
      order: 6,
      level: 1,
      parentCode: null,
      isAuditable: false,
    },
    {
      code: 'A.10.1',
      title: 'Controles criptográficos',
      description: null,
      order: 1,
      level: 2,
      parentCode: 'A.10',
      isAuditable: false,
    },
    {
      code: 'A.10.1.1',
      title: 'Política sobre el uso de controles criptográficos',
      description:
        'Se debe desarrollar e implementar una política sobre el uso de controles criptográficos para la protección de información',
      order: 1,
      level: 3,
      parentCode: 'A.10.1',
      isAuditable: true,
    },
    {
      code: 'A.10.1.2',
      title: 'Gestión de llaves',
      description:
        'Se debe desarrollar e implementar una política sobre el uso, protección y tiempo de vida de las llaves criptográficas',
      order: 2,
      level: 3,
      parentCode: 'A.10.1',
      isAuditable: true,
    },

    // Puedes continuar agregando más controles...
    // Este es un ejemplo con los primeros dominios
    // Una plantilla completa de ISO 27001:2013 tiene 114 controles en 14 dominios
  ],
}
