/**
 * Estado de cumplimiento de un control/standard
 */
export enum ComplianceStatus {
  /**
   * Cumple completamente - nivel obtenido >= nivel esperado
   */
  COMPLIANT = 'compliant',

  /**
   * Cumple parcialmente - nivel obtenido < nivel esperado pero > 0
   */
  PARTIAL = 'partial',

  /**
   * No cumple - nivel obtenido muy por debajo del esperado
   */
  NON_COMPLIANT = 'non_compliant',

  /**
   * No aplica - el control no es aplicable a esta organización
   */
  NOT_APPLICABLE = 'not_applicable',

  /**
   * Pendiente de evaluación
   */
  PENDING = 'pending',
}
