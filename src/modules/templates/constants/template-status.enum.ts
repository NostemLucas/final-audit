/**
 * Template Status Enum
 *
 * Estados del ciclo de vida de una plantilla
 */
export enum TemplateStatus {
  /**
   * Borrador - En edición, no disponible para usar en auditorías
   */
  DRAFT = 'draft',

  /**
   * Publicada - Lista para usar, READ-ONLY (no editable)
   */
  PUBLISHED = 'published',

  /**
   * Archivada - Obsoleta, no se puede usar en nuevas auditorías
   */
  ARCHIVED = 'archived',
}
