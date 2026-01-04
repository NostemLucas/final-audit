import { Injectable } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { TransactionService, Transactional } from '@core/database'

interface CreateUserDto {
  email: string
  name: string
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  // ============================================
  // OPCIÓN 1: Usar decorador @Transactional()
  // ============================================

  /**
   * Crear usuario con transacción automática usando decorador
   * Todo dentro de este método se ejecuta en una transacción
   * El EntityManager se obtiene automáticamente de CLS
   */
  @Transactional()
  async createUser(data: CreateUserDto) {
    // No necesitas pasar entityManager, se obtiene automáticamente de CLS
    const user = await this.userRepository.save({
      email: data.email,
      name: data.name,
    })

    // Simular otra operación que también usa la misma transacción
    console.log('Usuario creado:', user.id)

    return user
  }

  /**
   * Actualizar email con transacción automática
   * Si hay error, se hace rollback automáticamente
   */
  @Transactional()
  async updateUserEmail(userId: string, newEmail: string) {
    // Verificar que el email no exista
    const existingUser = await this.userRepository.findByEmail(newEmail)
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email ya está en uso')
    }

    // Actualizar email - usa automáticamente la transacción de CLS
    const updated = await this.userRepository.updateEmail(userId, newEmail)
    if (!updated) {
      throw new Error('Usuario no encontrado')
    }

    // Obtener usuario actualizado
    return await this.userRepository.findById(userId)
  }

  // ============================================
  // OPCIÓN 2: Usar TransactionService directamente
  // ============================================

  /**
   * Crear usuario y perfil en una sola transacción
   * Usando TransactionService.runInTransaction directamente
   */
  async createUserWithProfile(data: CreateUserDto) {
    return await this.transactionService.runInTransaction(async (entityManager) => {
      // Crear usuario - usa automáticamente el EntityManager de CLS
      const user = await this.userRepository.save({
        email: data.email,
        name: data.name,
      })

      // Simular creación de perfil (en otro repositorio)
      // profileRepository también obtendría el EntityManager de CLS automáticamente
      const profileId = 'profile-123'

      // Actualizar usuario con profileId
      await this.userRepository.update(user.id, { profileId })

      // Si hay error en cualquier parte, se hace rollback automático
      return await this.userRepository.findById(user.id)
    })
  }

  /**
   * Transferir datos entre usuarios (ejemplo de transacción compleja)
   */
  async transferUserData(fromUserId: string, toUserId: string) {
    return await this.transactionService.runInTransaction(async () => {
      // Obtener usuarios
      const fromUser = await this.userRepository.findById(fromUserId)
      const toUser = await this.userRepository.findById(toUserId)

      if (!fromUser || !toUser) {
        throw new Error('Usuario no encontrado')
      }

      // Realizar transferencia de datos
      // Todos los repositorios usan automáticamente la misma transacción de CLS
      await this.userRepository.update(toUserId, {
        profileId: fromUser.profileId,
      })

      await this.userRepository.softDelete(fromUserId)

      return { success: true }
    })
  }

  // ============================================
  // OPCIÓN 3: Sin transacción (operación simple)
  // ============================================

  /**
   * Buscar usuario por email - sin transacción
   * Usa el repositorio normal
   */
  async findUserByEmail(email: string) {
    return await this.userRepository.findByEmail(email)
  }

  /**
   * Listar todos los usuarios activos - sin transacción
   */
  async listActiveUsers() {
    return await this.userRepository.findActiveUsers()
  }

  // ============================================
  // EJEMPLO: Transacciones anidadas
  // ============================================

  /**
   * Las transacciones anidadas reusan la transacción padre
   */
  @Transactional()
  async complexOperation(userId: string) {
    // Esta transacción es la "padre"
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    // Llamar a otro método transaccional
    // Reutiliza la misma transacción (no crea una nueva)
    await this.updateUserEmail(userId, 'new@email.com')

    // Si hay error aquí, TODO se revierte (incluyendo updateUserEmail)
    return user
  }
}
