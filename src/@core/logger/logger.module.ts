import { Global, Module } from '@nestjs/common'
import { LoggerService } from './logger.service'
import {
  HttpLogger,
  ExceptionLogger,
  TypeOrmDatabaseLogger,
  StartupLogger,
} from './loggers'

@Global()
@Module({
  providers: [
    LoggerService,
    HttpLogger,
    ExceptionLogger,
    TypeOrmDatabaseLogger,
    StartupLogger,
  ],
  exports: [
    LoggerService,
    HttpLogger,
    ExceptionLogger,
    TypeOrmDatabaseLogger,
    StartupLogger,
  ],
})
export class LoggerModule {}
