/**
 * Tipos de auditoría
 */
export enum AuditType {
  /**
   * Auditoría inicial - primera vez que se audita a la organización
   */
  INICIAL = 'inicial',

  /**
   * Auditoría de seguimiento - verificar implementación de mejoras
   */
  SEGUIMIENTO = 'seguimiento',

  /**
   * Auditoría de recertificación - renovar certificación existente
   */
  RECERTIFICACION = 'recertificacion',

  /**
   * Auditoría extraordinaria - por evento especial o denuncia
   */
  EXTRAORDINARIA = 'extraordinaria',
}
