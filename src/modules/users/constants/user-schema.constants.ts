/**
 * User Schema Constraints
 *
 * Single Source of Truth para los límites de longitud de campos de usuario.
 * Estos valores se usan en:
 * - Entity (TypeORM column length)
 * - DTOs (class-validator decorators con @core/i18n)
 * - Swagger documentation (ApiProperty)
 *
 * Los mensajes de validación se generan automáticamente por el sistema i18n.
 * No es necesario definir mensajes manualmente.
 *
 * Ejemplo:
 *   @MinLength(USER_CONSTRAINTS.NAMES.MIN)
 *   names: string
 *   // Auto-genera: "El campo nombres debe tener al menos 2 caracteres"
 */
export const USER_CONSTRAINTS = {
  NAMES: {
    MIN: 2,
    MAX: 50,
  },
  LAST_NAMES: {
    MIN: 2,
    MAX: 50,
  },
  EMAIL: {
    MAX: 100,
  },
  USERNAME: {
    MIN: 3,
    MAX: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  CI: {
    MIN: 5,
    MAX: 15,
    PATTERN: /^[0-9A-Za-z-]+$/,
  },
  PASSWORD: {
    MIN: 8,
    MAX: 100,
  },
  PHONE: {
    MAX: 20,
  },
  ADDRESS: {
    MAX: 200,
  },
  IMAGE: {
    MAX: 500,
  },
} as const
