/**
 * Constantes para llaves de Redis
 *
 * Organización:
 * - PREFIXES: Prefijos base para cada tipo de token
 * - KEYS: Funciones para generar llaves completas
 */

export const REDIS_PREFIXES = {
  REFRESH_TOKEN: 'auth:refresh',
  BLACKLIST: 'auth:blacklist',
  RESET_PASSWORD: 'auth:reset-pw',
  TWO_FACTOR: 'auth:2fa',
  EMAIL_VERIFICATION: 'auth:verify-email',
} as const

export type RedisPrefix = (typeof REDIS_PREFIXES)[keyof typeof REDIS_PREFIXES]

export const CACHE_KEYS = {
  // Refresh Tokens
  REFRESH_TOKEN: (userId: string, tokenId: string) =>
    `${REDIS_PREFIXES.REFRESH_TOKEN}:${userId}:${tokenId}`,

  // Blacklist (access tokens revocados)
  BLACKLIST: (token: string) => `${REDIS_PREFIXES.BLACKLIST}:${token}`,

  // Reset Password Tokens
  RESET_PASSWORD: (userId: string, tokenId: string) =>
    `${REDIS_PREFIXES.RESET_PASSWORD}:${userId}:${tokenId}`,

  // 2FA Codes
  TWO_FACTOR: (userId: string, code: string) =>
    `${REDIS_PREFIXES.TWO_FACTOR}:${userId}:${code}`,

  // Email Verification Tokens
  EMAIL_VERIFICATION: (userId: string, tokenId: string) =>
    `${REDIS_PREFIXES.EMAIL_VERIFICATION}:${userId}:${tokenId}`,

  // Patrones para búsqueda
  USER_SESSIONS: (userId: string) =>
    `${REDIS_PREFIXES.REFRESH_TOKEN}:${userId}:*`,
  USER_RESET_TOKENS: (userId: string) =>
    `${REDIS_PREFIXES.RESET_PASSWORD}:${userId}:*`,
  USER_2FA_CODES: (userId: string) =>
    `${REDIS_PREFIXES.TWO_FACTOR}:${userId}:*`,
} as const
