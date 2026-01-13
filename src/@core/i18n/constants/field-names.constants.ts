/**
 * Field Names Dictionary
 *
 * Single Source of Truth para la traducción de nombres de campos.
 * Los nombres en inglés (claves) se traducen automáticamente al español (valores).
 *
 * Uso:
 * - Agregar aquí todos los campos de las entidades/DTOs
 * - El sistema i18n buscará automáticamente la traducción
 * - Si no encuentra traducción, usa el nombre original
 */
export const FIELD_NAMES = {
  // User fields
  names: 'nombres',
  lastNames: 'apellidos',
  email: 'correo electrónico',
  username: 'nombre de usuario',
  ci: 'cédula de identidad',
  password: 'contraseña',
  phone: 'teléfono',
  address: 'dirección',
  image: 'imagen',
  status: 'estado',
  roles: 'roles',
  organizationId: 'ID de organización',

  // Organization fields
  name: 'nombre',
  description: 'descripción',
  logo: 'logo',
  website: 'sitio web',
  contactEmail: 'correo de contacto',
  contactPhone: 'teléfono de contacto',

  // Template fields
  version: 'versión',
  templateId: 'ID de plantilla',
  isActive: 'activo',
  isEditable: 'editable',

  // Standard fields
  code: 'código',
  title: 'título',
  parentCode: 'código padre',
  order: 'orden',
  level: 'nivel',
  isAuditable: 'auditable',
  standardId: 'ID de estándar',

  // Common fields
  id: 'ID',
  createdAt: 'fecha de creación',
  updatedAt: 'fecha de actualización',
  deletedAt: 'fecha de eliminación',
  createdBy: 'creado por',
  updatedBy: 'actualizado por',

  // Auth fields
  token: 'token',
  refreshToken: 'token de actualización',
  accessToken: 'token de acceso',
  verificationCode: 'código de verificación',
  twoFactorCode: 'código 2FA',

  // Add more field translations as needed
} as const

/**
 * Helper para obtener el nombre traducido de un campo
 */
export const getFieldName = (fieldName: string): string => {
  return FIELD_NAMES[fieldName as keyof typeof FIELD_NAMES] || fieldName
}
