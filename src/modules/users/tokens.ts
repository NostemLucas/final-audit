/**
 * Repository tokens for dependency injection
 *
 * Separated from index.ts to avoid circular dependencies when
 * use-cases/validators need to import tokens
 */

export const USERS_REPOSITORY = Symbol('IUsersRepository')
