/**
 * Ejemplo de uso del logger mejorado
 * Para probar ejecuta: ts-node -r tsconfig-paths/register src/@core/logger/logger-example.ts
 */

import { TypeOrmDatabaseLogger } from './loggers/typeorm-database.logger'
import { BaseLogger } from './loggers/base.logger'
import { WinstonProvider } from './providers'

// Crear provider y loggers
const winstonProvider = new WinstonProvider()
const dbLogger = new TypeOrmDatabaseLogger(winstonProvider)
const logger = new BaseLogger(winstonProvider.getLogger(), 'example')

console.log('\n========== Ejemplos de Logger Mejorado ==========\n')

// 1. Log INFO básico
logger.info('Aplicación iniciada correctamente')

// 2. Log WARN con contexto base
logger.warn('Conexión lenta detectada', {
  service: 'api-gateway',
  correlationId: 'req-123-abc',
})

// 3. Log ERROR con contexto base
logger.error('Error al procesar petición', {
  service: 'order-service',
  correlationId: 'req-456-def',
  environment: 'production',
})

// 4. Log DEBUG con query SQL simple
dbLogger.logQuery('SELECT * FROM users WHERE id = $1', [123])

// 5. Log de query SQL compleja
dbLogger.logQuery(
  `
  SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  WHERE u.active = $1
    AND u.created_at >= $2
  GROUP BY u.id, u.name, u.email
  ORDER BY total_spent DESC
  LIMIT $3
`,
  [true, '2024-01-01', 10],
)

// 6. Log de slow query
dbLogger.logQuerySlow(
  1500,
  `
  SELECT * FROM orders o
  INNER JOIN order_items oi ON oi.order_id = o.id
  INNER JOIN products p ON p.id = oi.product_id
  WHERE o.status = $1
`,
  ['pending'],
)

// 7. Log de error de query
dbLogger.logQueryError(
  new Error('duplicate key value violates unique constraint "users_email_key"'),
  'INSERT INTO users (name, email) VALUES ($1, $2)',
  ['John Doe', 'existing@example.com'],
)

// 8. Log de migración
dbLogger.logMigration('Running migration: CreateUsersTable1234567890')

// 9. Log de conexión
dbLogger.logConnection('connect', 'postgres://localhost:5432/myapp')

console.log('\n========== Fin de Ejemplos ==========\n')
