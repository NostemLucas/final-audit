import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { EmailModule } from '@core/email/email.module'
import { DatabaseModule } from '@core/database'
import { SecurityModule } from '@core/security'
import { HttpModule } from '@core/http/http.module'
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core'
import { LoggerModule } from '@core/logger'
import { HttpExceptionFilter } from '@core/filters'
import { LoggingInterceptor, AuditInterceptor } from '@core/interceptors'
import { databaseConfig } from '@core/config'
import { FilesModule } from '@core/files'
import { PersistenceModule } from '@core/persistence'
import { CacheModule } from '@core/cache'
import { UsersModule } from './modules/users'
import { OrganizationsModule } from './modules/organizations'
import { AuthModule } from './modules/auth'
import { AuthorizationModule, PermissionsGuard } from './modules/authorization'
import { TemplatesModule } from './modules/templates'
import { MaturityModule } from './modules/maturity'

@Module({
  imports: [
    // Core modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    DatabaseModule,
    CacheModule,
    FilesModule,
    LoggerModule,
    EmailModule,
    PersistenceModule,
    SecurityModule, // Password hashing
    HttpModule, // Cookie management

    // Authentication & Authorization
    AuthModule, // Guards: JwtAuthGuard, RolesGuard
    AuthorizationModule, // Casbin-based permissions (ABAC)

    // Feature modules
    OrganizationsModule,
    UsersModule,
    TemplatesModule,
    MaturityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // ========================================
    // Global Guards (orden de ejecución)
    // ========================================
    // 1. JwtAuthGuard (registrado en AuthModule)
    // 2. RolesGuard (registrado en AuthModule)
    // 3. PermissionsGuard (Casbin - DESPUÉS de Auth)
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },

    // ========================================
    // Global Filters
    // ========================================
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ========================================
    // Global Interceptors (orden de ejecución)
    // ========================================
    // 1. LoggingInterceptor: Logging de requests HTTP
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 2. AuditInterceptor: Captura usuario y lo guarda en CLS para auditoría
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
