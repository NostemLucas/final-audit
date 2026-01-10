/**
 * Mock Helpers - Utilidades para crear mocks de Jest más fácilmente
 *
 * Uso:
 * ```typescript
 * const mockRepo = createMock<IOrganizationRepository>({
 *   findAll: jest.fn().mockResolvedValue([]),
 *   findById: jest.fn().mockResolvedValue(null),
 * })
 * ```
 */

/**
 * Crea un mock tipado con Jest
 *
 * @param partial - Métodos mock específicos
 * @returns Mock tipado completo
 */
export function createMock<T>(
  partial: Partial<jest.Mocked<T>> = {},
): jest.Mocked<T> {
  return partial as jest.Mocked<T>
}

/**
 * Crea un mock de repositorio con métodos comunes preconfigurados
 *
 * @param overrides - Sobrescribe comportamiento por defecto
 * @returns Mock del repositorio
 */
export function createRepositoryMock<T>(
  overrides: Partial<jest.Mocked<T>> = {},
): jest.Mocked<T> {
  const defaultMock = {
    create: jest.fn(),
    createMany: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(false),
    patch: jest.fn(),
    softDelete: jest.fn().mockResolvedValue(false),
    recover: jest.fn().mockResolvedValue(false),
    ...overrides,
  }

  return defaultMock as unknown as jest.Mocked<T>
}

/**
 * Crea un mock de validator con métodos comunes preconfigurados
 */
export function createValidatorMock<T>(
  overrides: Partial<jest.Mocked<T>> = {},
): jest.Mocked<T> {
  return overrides as jest.Mocked<T>
}

/**
 * Crea un mock de factory con métodos comunes preconfigurados
 */
export function createFactoryMock<T>(
  overrides: Partial<jest.Mocked<T>> = {},
): jest.Mocked<T> {
  return overrides as jest.Mocked<T>
}
