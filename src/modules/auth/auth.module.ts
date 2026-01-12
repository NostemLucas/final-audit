import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'
import type * as ms from 'ms'
import { UsersModule } from '../users/users.module'
import { AuthController } from './controllers'
import { TokensService, AuthService } from './services'
import {
  ValidateUserUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
} from './use-cases'
import { LocalStrategy, JwtStrategy, JwtRefreshStrategy } from './strategies'
import { JwtAuthGuard, RolesGuard } from './guards'

/**
 * AuthModule
 *
 * Módulo de autenticación completo con:
 * - JWT con access tokens (15min) y refresh tokens (7 días)
 * - HTTP-only cookies para refresh tokens
 * - Token rotation en cada refresh
 * - Blacklist con Redis para logout
 * - Guards globales para protección de rutas
 * - Decorators para rutas públicas y control de roles
 *
 * @example
 * ```typescript
 * // Ruta pública
 * @Public()
 * @Get('stats')
 * async getStats() { }
 *
 * // Ruta protegida
 * @Get('me')
 * async getMe(@GetUser() user: JwtPayload) { }
 *
 * // Ruta con roles
 * @Roles(Role.ADMIN, Role.GERENTE)
 * @Post('users')
 * async createUser(@Body() dto: CreateUserDto) { }
 * ```
 */
@Module({
  imports: [
    // Configuración de Passport
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false, // Stateless authentication
    }),

    // Configuración de JWT para access tokens
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(
          'JWT_SECRET',
          'your-secret-key-change-in-production',
        )
        const expiresIn = configService.get<string>(
          'JWT_EXPIRES_IN',
          '15m',
        ) as ms.StringValue

        if (!secret) {
          throw new Error('JWT_SECRET is required')
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        }
      },
    }),

    // UsersModule para acceder a UserRepository
    UsersModule,
  ],

  controllers: [AuthController],

  providers: [
    // ========================================
    // Services
    // ========================================
    TokensService,
    AuthService,
    ConfigService,
    // ========================================
    // Use Cases
    // ========================================
    ValidateUserUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,

    // ========================================
    // Passport Strategies
    // ========================================
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,

    // ========================================
    // Guards (para poder exportar y usar globalmente)
    // ========================================
    JwtAuthGuard, // Registrado como provider normal
    RolesGuard, // Registrado como provider normal

    // ========================================
    // Global Guards (registrados como APP_GUARD)
    // ========================================
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ✅ Protege TODAS las rutas por defecto (usar @Public() para excepciones)
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // ✅ Verifica roles cuando se usa @Roles()
    },
  ],

  exports: [
    // Exportar AuthService para otros módulos si lo necesitan
    AuthService,
    // Exportar guards para uso manual si es necesario (ahora sí están en providers)
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
