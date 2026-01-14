/**
 * Configuración centralizada de Rate Limiting para Auth
 *
 * Todas las configuraciones se pueden sobrescribir via variables de entorno
 * con valores por defecto seguros
 */

export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttemptsByIp: parseInt(process.env.MAX_LOGIN_ATTEMPTS_IP || '10', 10),
    maxAttemptsByUser: parseInt(process.env.MAX_LOGIN_ATTEMPTS_USER || '5', 10),
    windowMinutes: parseInt(
      process.env.LOGIN_ATTEMPTS_WINDOW_MINUTES || '15',
      10,
    ),
  },
  resetPassword: {
    maxAttemptsByIp: parseInt(
      process.env.MAX_RESET_PASSWORD_ATTEMPTS_IP || '10',
      10,
    ),
    windowMinutes: parseInt(
      process.env.RESET_PASSWORD_ATTEMPTS_WINDOW_MINUTES || '60',
      10,
    ),
  },
  twoFactor: {
    maxAttempts: parseInt(process.env.MAX_2FA_ATTEMPTS || '5', 10),
    windowMinutes: parseInt(
      process.env.TWO_FA_ATTEMPTS_WINDOW_MINUTES || '5',
      10,
    ),
  },
} as const
