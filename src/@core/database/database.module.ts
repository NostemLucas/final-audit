import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { TransactionService } from './transaction.service'

/**
 * Módulo global de database que proporciona:
 * - CLS (Continuation Local Storage) para request scope
 * - TransactionService para manejar transacciones
 */
@Global()
@Module({
  imports: [
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
