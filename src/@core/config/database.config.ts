import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { TypeOrmDatabaseLogger } from '../logger/loggers/typeorm-database.logger'

/**
 * Configuración de TypeORM para la aplicación NestJS
 *
 * PROPÓSITO:
 * - Configuración SOLO para la app en runtime
 * - Usada por DatabaseModule y TypeOrmModule
 *
 * Para configuración de CLI (migrations, seeds), ver:
 * @see src/@core/database/config/data-source.ts
 */

function getDatabaseConfigForNestJS(): TypeOrmModuleOptions {
  // Configuración base
  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    logger: new TypeOrmDatabaseLogger(1000),
    maxQueryExecutionTime: 1000,
    autoLoadEntities: true,
  }

  // Priorizar DATABASE_URL si existe
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
    }
  }

  // Fallback a variables separadas
  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'audit_core_db',
  }
}

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => getDatabaseConfigForNestJS(),
)
