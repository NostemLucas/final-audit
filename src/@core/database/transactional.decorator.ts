import 'reflect-metadata'

/**
 * Clave de metadata para identificar métodos transaccionales
 */
export const TRANSACTIONAL_METADATA_KEY = Symbol('transactional')

/**
 * Decorador que marca un método para que se ejecute dentro de una transacción
 *
 * VENTAJA: Ya NO necesitas inyectar TransactionService en el constructor
 * El sistema de Discovery automáticamente envuelve el método en una transacción
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     // ✅ YA NO NECESITAS TransactionService aquí
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
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    // Solo guardamos metadata para que el Discovery lo encuentre
    Reflect.defineMetadata(
      TRANSACTIONAL_METADATA_KEY,
      true,
      target,
      propertyKey,
    )

    return descriptor
  }
}
