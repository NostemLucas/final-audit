/**
 * Validación de códigos 2FA (Two-Factor Authentication)
 *
 * Estos son códigos numéricos temporales enviados por email
 * Usado para verificación adicional de identidad
 */

export const TWO_FACTOR_CONSTRAINTS = {
  /**
   * Validación del código 2FA
   *
   * - Exactamente 6 dígitos (configurable vía env: TWO_FACTOR_CODE_LENGTH)
   * - Solo números
   * - Sin espacios ni caracteres especiales
   */
  CODE: {
    LENGTH: 6, // Puede sobrescribirse con process.env.TWO_FACTOR_CODE_LENGTH
    PATTERN: /^\d{6}$/, // Exactamente 6 dígitos
    MESSAGE: 'El código debe tener exactamente 6 dígitos numéricos',
  },

  /**
   * Validación del token JWT para 2FA
   *
   * - Token JWT que acompaña al código
   * - Evita que alguien adivine códigos sin el token
   * - Mínimo 10 caracteres (JWT básico)
   * - Máximo 1000 caracteres (protección contra payloads gigantes)
   */
  TOKEN: {
    MIN: 10,
    MAX: 1000,
  },

  /**
   * Validación del identificador (email o userId)
   *
   * - Para generar código 2FA
   * - Puede ser email o UUID
   */
  IDENTIFIER: {
    MAX: 255,
    MESSAGE: 'El email o ID de usuario es requerido',
  },
}
