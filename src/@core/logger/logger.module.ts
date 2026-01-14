import { Global, Module } from '@nestjs/common'
import { LoggerService } from './logger.service'
import {
  HttpLogger,
  ExceptionLogger,
  TypeOrmDatabaseLogger,
  StartupLogger,
} from './loggers'
import { WinstonProvider } from './providers'

@Global()
@Module({
  providers: [
    WinstonProvider, // ← Singleton que provee la instancia compartida de Winston
    LoggerService,
    HttpLogger,
    ExceptionLogger,
    TypeOrmDatabaseLogger,
    StartupLogger,
  ],
  exports: [
    WinstonProvider,
    LoggerService,
    HttpLogger,
    ExceptionLogger,
    TypeOrmDatabaseLogger,
    StartupLogger,
  ],
})
export class LoggerModule {}
