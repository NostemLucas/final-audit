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
    MAX: 100, // Nota: Se hashea antes de guardar, el hash puede ser más largo
  },
  PHONE: {
    MAX: 20,
  },
  ADDRESS: {
    MAX: 200,
  },
  IMAGE: {
    MAX: 500, // URL o path de la imagen
  },
} as const

/**
 * @deprecated Ya no es necesario definir mensajes manualmente.
 * El sistema i18n genera mensajes automáticamente en español.
 * Este objeto se mantiene por compatibilidad pero se puede eliminar.
 *
 * Para eliminar:
 * 1. Verificar que todos los DTOs usen validadores de @core/i18n
 * 2. Eliminar imports de USER_VALIDATION_MESSAGES
 * 3. Eliminar este objeto
 */
export const USER_VALIDATION_MESSAGES = {
  NAMES: {
    MIN: `Los nombres deben tener al menos ${USER_CONSTRAINTS.NAMES.MIN} caracteres`,
    MAX: `Los nombres no pueden exceder ${USER_CONSTRAINTS.NAMES.MAX} caracteres`,
  },
  LAST_NAMES: {
    MIN: `Los apellidos deben tener al menos ${USER_CONSTRAINTS.LAST_NAMES.MIN} caracteres`,
    MAX: `Los apellidos no pueden exceder ${USER_CONSTRAINTS.LAST_NAMES.MAX} caracteres`,
  },
  EMAIL: {
    INVALID: 'Debe proporcionar un email válido',
    MAX: `El email no puede exceder ${USER_CONSTRAINTS.EMAIL.MAX} caracteres`,
  },
  USERNAME: {
    MIN: `El nombre de usuario debe tener al menos ${USER_CONSTRAINTS.USERNAME.MIN} caracteres`,
    MAX: `El nombre de usuario no puede exceder ${USER_CONSTRAINTS.USERNAME.MAX} caracteres`,
    PATTERN:
      'El nombre de usuario solo puede contener letras, números y guión bajo',
  },
  CI: {
    MIN: `El CI debe tener al menos ${USER_CONSTRAINTS.CI.MIN} caracteres`,
    MAX: `El CI no puede exceder ${USER_CONSTRAINTS.CI.MAX} caracteres`,
    PATTERN: 'El CI solo puede contener números, letras y guiones',
  },
  PASSWORD: {
    MIN: `La contraseña debe tener al menos ${USER_CONSTRAINTS.PASSWORD.MIN} caracteres`,
    MAX: `La contraseña no puede exceder ${USER_CONSTRAINTS.PASSWORD.MAX} caracteres`,
  },
  PHONE: {
    MAX: `El teléfono no puede exceder ${USER_CONSTRAINTS.PHONE.MAX} caracteres`,
  },
  ADDRESS: {
    MAX: `La dirección no puede exceder ${USER_CONSTRAINTS.ADDRESS.MAX} caracteres`,
  },
} as const
