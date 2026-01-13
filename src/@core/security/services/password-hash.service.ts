import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

/**
 * Password Hash Service
 *
 * Servicio de infraestructura para hashear y verificar contraseñas
 * Usa bcrypt con salt rounds = 10
 *
 * Este servicio desacopla la lógica de hashing de passwords de los módulos
 * de negocio (users, auth), permitiendo reutilización y fácil testing
 */
@Injectable()
export class PasswordHashService {
  private readonly saltRounds = 10

  /**
   * Hashea una contraseña en texto plano
   *
   * @param password - Contraseña en texto plano
   * @returns Promise con el hash bcrypt
   *
   * @example
   * ```typescript
   * const hash = await passwordHashService.hash('MySecurePass123!')
   * // hash = "$2b$10$..."
   * ```
   */
  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds)
  }

  /**
   * Verifica si una contraseña coincide con un hash
   *
   * @param password - Contraseña en texto plano a verificar
   * @param hash - Hash bcrypt almacenado
   * @returns Promise<boolean> - true si coincide, false si no
   *
   * @example
   * ```typescript
   * const isValid = await passwordHashService.verify('MySecurePass123!', storedHash)
   * if (isValid) {
   *   // Password correcta
   * }
   * ```
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }
}
