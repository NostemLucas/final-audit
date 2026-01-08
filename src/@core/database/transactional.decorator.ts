import { TransactionService } from './transaction.service'

/**
 * Decorador que envuelve un método en una transacción automáticamente
 *
 * IMPORTANTE: La clase DEBE tener TransactionService inyectado en el constructor
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private readonly transactionService: TransactionService, // ✅ REQUERIDO
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
 *
 * Si olvidas inyectar TransactionService, obtendrás un error claro:
 * "El decorador @Transactional() requiere que 'transactionService' esté inyectado en el constructor de UserService"
 */
/**
 * Interfaz para clases que tienen TransactionService inyectado
 */
interface WithTransactionService {
  transactionService: TransactionService
  constructor: { name: string }
}

export function Transactional(): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    // Guardamos el método original
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod = descriptor.value

    // Reemplazamos el método
    descriptor.value = async function (
      this: WithTransactionService,
      ...args: unknown[]
    ): Promise<unknown> {
      // ✅ Buscamos 'transactionService' en la instancia (debe estar en el constructor)
      const transactionService = this.transactionService

      if (!transactionService) {
        throw new Error(
          `El decorador @Transactional() requiere que 'transactionService' esté inyectado en el constructor de ${this.constructor.name}. ` +
            `Ejemplo: constructor(private readonly transactionService: TransactionService, ...) {}`,
        )
      }

      // Envolvemos todo en la transacción
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await transactionService.runInTransaction(async () => {
        // Usamos apply para ejecutar el método original con el contexto 'this' correcto
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return await originalMethod.apply(this, args)
      })
    }

    return descriptor
  }
}
