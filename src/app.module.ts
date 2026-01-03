import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from '@core';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from '@core/interceptors/logging.interceptor';

@Module({
  imports: [LoggerModule],
  controllers: [AppController],
  providers: [AppService,    
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },],
})
export class AppModule {}
