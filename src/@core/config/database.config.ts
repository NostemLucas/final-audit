import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { TypeOrmDatabaseLogger } from '../logger/loggers/typeorm-database.logger'

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'notifications_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    logger: new TypeOrmDatabaseLogger(1000), // 1000ms = 1s threshold para slow queries
    maxQueryExecutionTime: 1000, // Advertir si una query tarda más de 1 segundo
  }),
)
