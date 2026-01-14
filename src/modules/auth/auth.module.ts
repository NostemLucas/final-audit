import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'
import type * as ms from 'ms'
import { AuthController } from './controllers'
import {
  TokensService,
  AuthService,
  ResetPasswordTokenService,
  TwoFactorTokenService,
} from './services'
import {
  ValidateUserUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  RequestResetPasswordUseCase,
  ResetPasswordUseCase,
  Generate2FACodeUseCase,
  Verify2FACodeUseCase,
  Resend2FACodeUseCase,
} from './use-cases'
import { LocalStrategy, JwtStrategy, JwtRefreshStrategy } from './strategies'
import { JwtAuthGuard } from './guards'
import { JwtTokenHelper } from './helpers'

@Module({
  imports: [
    // Configuración de Passport
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
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
  ],

  controllers: [AuthController],

  providers: [
    // ========================================
    // Helpers
    // ========================================
    JwtTokenHelper,

    // ========================================
    // Services
    // ========================================
    TokensService,
    ResetPasswordTokenService,
    TwoFactorTokenService,
    AuthService,
    ConfigService,
    // ========================================
    // Use Cases
    // ========================================
    // Login/Logout/Refresh
    ValidateUserUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,

    // Password Reset
    RequestResetPasswordUseCase,
    ResetPasswordUseCase,

    // Two-Factor Authentication
    Generate2FACodeUseCase,
    Verify2FACodeUseCase,
    Resend2FACodeUseCase,

    // ========================================
    // Passport Strategies
    // ========================================
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,

    // ========================================
    // Guards
    // ========================================
    JwtAuthGuard, // Guard de autenticación JWT (local al módulo auth)
    // ========================================
    // Global Guards (registrados como APP_GUARD)
    // ========================================
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ✅ Protege TODAS las rutas por defecto (usar @Public() para excepciones)
    },
  ],

  exports: [
    // Exportar helper para otros módulos si lo necesitan
    JwtTokenHelper,
    // Exportar servicios para otros módulos si lo necesitan
    AuthService,
    TokensService,
    ResetPasswordTokenService,
    TwoFactorTokenService,
    // Exportar guards para uso manual si es necesario
    JwtAuthGuard,
  ],
})
export class AuthModule {}
