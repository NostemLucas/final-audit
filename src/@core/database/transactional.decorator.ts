import { Inject } from '@nestjs/common'
import { TransactionService } from './transaction.service'

/**
 * Interfaz para clases que tienen TransactionService inyectado
 */
interface WithTransactionService {
  transactionService: TransactionService
}

/**
 * Type para métodos asíncronos genéricos
 */
type AsyncMethod<T = unknown> = (...args: unknown[]) => Promise<T>

/**
 * Decorador que envuelve un método en una transacción automáticamente
 *
 * IMPORTANTE: La clase debe tener TransactionService inyectado
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private readonly transactionService: TransactionService,
 *     private readonly userRepository: UserRepository,
 *   ) {}
 *
 *   @Transactional()
 *   async createUserWithProfile(userData: CreateUserDto) {
 *     // Todo dentro de esta función se ejecuta en una transacción
 *     const user = await this.userRepository.save(userData)
 *     const profile = await this.profileRepository.save({ userId: user.id })
 *     return { user, profile }
 *   }
 * }
 * ```
 */
export function Transactional(): MethodDecorator {
  const injectTransactionService = Inject(TransactionService)

  return (
    target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    // Inyectar TransactionService si no está inyectado
    injectTransactionService(target, 'transactionService')

    const originalMethod = descriptor.value as AsyncMethod

    descriptor.value = async function (
      this: WithTransactionService,
      ...args: unknown[]
    ): Promise<unknown> {
      const transactionService = this.transactionService

      if (!transactionService) {
        throw new Error(
          `@Transactional() decorator requires TransactionService to be injected`,
        )
      }

      // Ejecutar el método dentro de una transacción
      return await transactionService.runInTransaction(async () => {
        return (await originalMethod.apply(this, args)) as unknown
      })
    }

    return descriptor
  }
}
