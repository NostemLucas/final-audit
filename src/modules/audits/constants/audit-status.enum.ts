/**
 * Estados de una auditoría
 */
export enum AuditStatus {
  /**
   * Borrador - auditoría en planificación
   */
  DRAFT = 'draft',

  /**
   * En progreso - auditoría en ejecución
   */
  IN_PROGRESS = 'in_progress',

  /**
   * En revisión - auditoría completada, pendiente de revisión
   */
  IN_REVIEW = 'in_review',

  /**
   * Completada - auditoría finalizada y aprobada
   */
  COMPLETED = 'completed',

  /**
   * Cancelada - auditoría cancelada
   */
  CANCELLED = 'cancelled',
}
