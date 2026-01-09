import { UserEntity, UserStatus, Role } from '../../entities/user.entity'
import type { IUsersRepository } from '../../repositories'

/**
 * ✅ FAKE REPOSITORY - Implementación en memoria del repository
 *
 * Ventajas:
 * - Comportamiento REAL (guarda, busca, actualiza datos)
 * - Sin necesidad de mockear función por función
 * - Tests más legibles y mantenibles
 * - Más cercano al comportamiento real de la DB
 *
 * Cuándo usar:
 * - Tests de integración donde quieres probar lógica compleja
 * - Cuando necesitas múltiples operaciones sobre los mismos datos
 * - Tests E2E sin DB real
 */
export class FakeUsersRepository implements IUsersRepository {
  private users: Map<string, UserEntity> = new Map()
  private currentId = 1

  /**
   * Limpia todos los datos (útil en beforeEach)
   */
  clear(): void {
    this.users.clear()
    this.currentId = 1
  }

  /**
   * Agrega usuarios de prueba predefinidos
   */
  seed(users: UserEntity[]): void {
    users.forEach((user) => {
      this.users.set(user.id, { ...user })
    })
  }

  async save(user: Partial<UserEntity>): Promise<UserEntity> {
    // Simula generación de ID
    if (!user.id) {
      user.id = `user-${this.currentId++}`
    }

    // Simula timestamps
    const now = new Date()
    if (!user.createdAt) {
      user.createdAt = now
    }
    user.updatedAt = now

    const savedUser = user as UserEntity
    this.users.set(savedUser.id, { ...savedUser })
    return { ...savedUser }
  }

  async findAll(): Promise<UserEntity[]> {
    return Array.from(this.users.values()).filter((u) => !u.deletedAt)
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id)
    return user && !user.deletedAt ? { ...user } : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.email === email && !user.deletedAt) {
        return { ...user }
      }
    }
    return null
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.username === username && !user.deletedAt) {
        return { ...user }
      }
    }
    return null
  }

  async findByCI(ci: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.ci === ci && !user.deletedAt) {
        return { ...user }
      }
    }
    return null
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    return Array.from(this.users.values()).filter(
      (u) => u.organizationId === organizationId && !u.deletedAt,
    )
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email === email && user.id !== excludeId && !user.deletedAt) {
        return true
      }
    }
    return false
  }

  async existsByUsername(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    for (const user of this.users.values()) {
      if (
        user.username === username &&
        user.id !== excludeId &&
        !user.deletedAt
      ) {
        return true
      }
    }
    return false
  }

  async existsByCI(ci: string, excludeId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.ci === ci && user.id !== excludeId && !user.deletedAt) {
        return true
      }
    }
    return false
  }

  async softDelete(id: string): Promise<void> {
    const user = this.users.get(id)
    if (user) {
      user.deletedAt = new Date()
      this.users.set(id, user)
    }
  }

  // Método útil para tests: obtener todos los usuarios (incluso eliminados)
  getAllIncludingDeleted(): UserEntity[] {
    return Array.from(this.users.values())
  }

  // Método útil para tests: contar usuarios
  count(): number {
    return Array.from(this.users.values()).filter((u) => !u.deletedAt).length
  }
}
