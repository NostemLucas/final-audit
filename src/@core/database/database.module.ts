import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { TransactionService } from './transaction.service'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'

/**
 * Módulo global de database implementa:
 * - CLS (Continuation Local Storage) para request scope
 * - TransactionService para manejar transacciones
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database')
        if (!dbConfig) {
          throw new Error(
            'La configuración de la base de datos no fue cargada correctamente',
          )
        }
        return dbConfig
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        // Montar CLS middleware automáticamente
        mount: true,
        // Generar ID único para cada request
        generateId: true,
      },
    }),
  ],
  providers: [TransactionService],
  exports: [TransactionService, ClsModule],
})
export class DatabaseModule {}
