import { DataSource, DataSourceOptions } from 'typeorm'
import { config } from 'dotenv'
import { SeederOptions } from 'typeorm-extension'
import { TypeOrmDatabaseLogger } from '@core/logger'

config()

export const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'notifications_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/@core/database/migrations/*{.ts,.js}'],
  seeds: ['src/@core/database/seeds/*{.ts,.js}'],
  synchronize: false,
  // Configuración de logging personalizada
  logging: process.env.NODE_ENV === 'development',
  logger: new TypeOrmDatabaseLogger(1000),
  maxQueryExecutionTime: 1000,
}

const dataSource = new DataSource(dataSourceOptions)

export default dataSource
