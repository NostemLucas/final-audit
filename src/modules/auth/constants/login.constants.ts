/**
 * Validación de credenciales para Login
 *
 * Estas reglas son FLEXIBLES porque:
 * - Deben aceptar passwords existentes (incluso si no cumplen reglas actuales)
 * - Solo validamos que no estén vacías y tengan un límite razonable
 * - La validación real de la contraseña se hace en el servicio (comparando hash)
 */

export const LOGIN_CONSTRAINTS = {
  /**
   * Validación del identificador (email o username)
   *
   * - Máximo 255 caracteres (estándar de email + username)
   * - No validamos formato aquí (puede ser email o username)
   */
  USERNAME_OR_EMAIL: {
    MAX: 255,
    MESSAGE: 'El email o username es requerido',
  },

  /**
   * Validación de contraseña en login
   *
   * - Solo validamos longitud máxima (protección contra DoS)
   * - NO validamos complejidad (debe aceptar passwords viejas)
   * - La validación real se hace comparando el hash
   */
  PASSWORD: {
    MAX: 128,
    MESSAGE: 'La contraseña es requerida',
  },
}
