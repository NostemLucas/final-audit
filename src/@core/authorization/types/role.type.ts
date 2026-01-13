/**
 * Type genérico para roles de usuario
 *
 * Define Role como un tipo string para permitir cualquier valor de rol
 * sin acoplamiento a un enum específico de dominio
 *
 * Los módulos de dominio (como users) pueden definir sus propios enums
 * de Role que son compatibles con este type
 *
 * @example
 * ```typescript
 * // En el módulo de dominio
 * export enum UserRole {
 *   ADMIN = 'admin',
 *   EDITOR = 'editor',
 *   VIEWER = 'viewer'
 * }
 *
 * // Uso con el decorator
 * @Roles('admin', 'editor')
 * // o
 * @Roles(UserRole.ADMIN, UserRole.EDITOR)
 * ```
 */
export type Role = string
