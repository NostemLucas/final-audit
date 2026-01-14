/**
 * Demostración de Detección de Transacciones en el Logger
 *
 * Este archivo muestra cómo el logger detecta automáticamente
 * cuando las queries están dentro de una transacción.
 *
 * NOTA: Este es solo un ejemplo educativo. En producción,
 * TypeORM llamará a estos métodos automáticamente.
 */

import { TypeOrmDatabaseLogger } from '../loggers/typeorm-database.logger'

// Mock de QueryRunner para simular transacciones
class MockQueryRunner {
  public isTransactionActive = false

  startTransaction() {
    this.isTransactionActive = true
    console.log('\n🔵 INICIO DE TRANSACCIÓN\n')
  }

  commitTransaction() {
    this.isTransactionActive = false
    console.log('\n🟢 COMMIT DE TRANSACCIÓN\n')
  }

  rollbackTransaction() {
    this.isTransactionActive = false
    console.log('\n🔴 ROLLBACK DE TRANSACCIÓN\n')
  }
}

// Crear instancias
const logger = TypeOrmDatabaseLogger.createStandalone()
const queryRunner = new MockQueryRunner() as any

console.log('========================================')
console.log('📊 DEMO: Detección de Transacciones')
console.log('========================================\n')

// ============================================
// ESCENARIO 1: Queries SIN transacción
// ============================================
console.log('📝 ESCENARIO 1: Queries normales (sin transacción)\n')

logger.logQuery('SELECT * FROM users WHERE id = $1', [123])

logger.logQuery('SELECT * FROM orders WHERE user_id = $1 AND status = $2', [
  123,
  'pending',
])

// ============================================
// ESCENARIO 2: Queries DENTRO de transacción
// ============================================
console.log('\n📝 ESCENARIO 2: Queries dentro de transacción\n')

queryRunner.startTransaction()

logger.logQuery(
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
  ['John Doe', 'john@example.com'],
  queryRunner,
)

logger.logQuery(
  'INSERT INTO profiles (user_id, bio) VALUES ($1, $2)',
  [456, 'Software Developer'],
  queryRunner,
)

logger.logQuery(
  'UPDATE users SET updated_at = NOW() WHERE id = $1',
  [456],
  queryRunner,
)

queryRunner.commitTransaction()

// ============================================
// ESCENARIO 3: Error dentro de transacción
// ============================================
console.log('\n📝 ESCENARIO 3: Error dentro de transacción (con rollback)\n')

queryRunner.startTransaction()

logger.logQuery(
  'INSERT INTO orders (user_id, total) VALUES ($1, $2)',
  [789, 99.99],
  queryRunner,
)

logger.logQueryError(
  new Error('duplicate key value violates unique constraint'),
  'INSERT INTO order_items (order_id, product_id) VALUES ($1, $2)',
  [100, 200],
  queryRunner,
)

queryRunner.rollbackTransaction()

// ============================================
// ESCENARIO 4: Slow query dentro de transacción
// ============================================
console.log('\n📝 ESCENARIO 4: Slow query dentro de transacción ⚠️\n')

queryRunner.startTransaction()

logger.logQuerySlow(
  2500,
  `SELECT o.*, u.name, u.email
   FROM orders o
   JOIN users u ON u.id = o.user_id
   WHERE o.created_at > NOW() - INTERVAL '1 year'`,
  [],
  queryRunner,
)

queryRunner.commitTransaction()

// ============================================
// ESCENARIO 5: Migración dentro de transacción
// ============================================
console.log('\n📝 ESCENARIO 5: Migración dentro de transacción\n')

queryRunner.startTransaction()

logger.logMigration('Running CreateUsersTable1234567890', queryRunner)

logger.logQuery(
  `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
  )`,
  [],
  queryRunner,
)

logger.logMigration('CreateUsersTable1234567890 completed', queryRunner)

queryRunner.commitTransaction()

console.log('\n========================================')
console.log('✅ DEMO COMPLETADO')
console.log('========================================\n')

console.log('💡 NOTAS IMPORTANTES:')
console.log('   • Las queries SIN [TRX] están FUERA de transacción')
console.log('   • Las queries CON [TRX] están DENTRO de transacción')
console.log('   • Slow queries con [TRX] son CRÍTICAS (bloquean la DB)')
console.log('   • En producción, TypeORM maneja esto automáticamente\n')
