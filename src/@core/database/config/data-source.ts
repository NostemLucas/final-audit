import { DataSource, DataSourceOptions } from 'typeorm'
import { config } from 'dotenv'
import { SeederOptions } from 'typeorm-extension'
import { TypeOrmDatabaseLogger } from '@core/logger'

config()

/**
 * Configuración de TypeORM para CLI (migrations y seeds)
 *
 * PROPÓSITO:
 * - Configuración SOLO para comandos CLI
 * - Usada por: migration:generate, migration:run, migration:revert, seed:run, etc.
 *
 *
 * @see src/@core/config/database.config.ts - Configuración para la app
 */

/**
 * Genera las opciones de configuración para TypeORM CLI
 */
function getTypeORMConfigForCLI(): DataSourceOptions & SeederOptions {
  const projectRoot = process.cwd()

  // Configuración base
  const baseConfig: DataSourceOptions & SeederOptions = {
    type: 'postgres',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    logger: new TypeOrmDatabaseLogger(),
    maxQueryExecutionTime: 1000,
    entities: [`${projectRoot}/src/**/*.entity.ts`],
    migrations: [`${projectRoot}/src/@core/database/migrations/*{.ts,.js}`],
    seeds: [`${projectRoot}/src/@core/database/seeds/*{.ts,.js}`],
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

export const dataSourceOptions = getTypeORMConfigForCLI()
const dataSource = new DataSource(dataSourceOptions)

export default dataSource
