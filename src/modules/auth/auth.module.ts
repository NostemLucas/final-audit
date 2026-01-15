import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { APP_GUARD } from '@nestjs/core'
import type * as ms from 'ms'
import {
  AuthController,
  PasswordResetController,
  TwoFactorController,
} from './controllers'
import {
  TokensService,
  ResetPasswordTokenService,
  TwoFactorTokenService,
} from './services'
import {
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  RequestResetPasswordUseCase,
  ResetPasswordUseCase,
  Generate2FACodeUseCase,
  Verify2FACodeUseCase,
  Resend2FACodeUseCase,
} from './use-cases'
import { JwtStrategy, JwtRefreshStrategy } from './strategies'
import { JwtAuthGuard } from './guards'
import { JwtTokenHelper } from './helpers'
import { LoginRateLimitPolicy, EmailOperationRateLimitPolicy } from './policies'

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

  controllers: [AuthController, PasswordResetController, TwoFactorController],

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

    ConfigService,

    // ========================================
    // Policies
    // ========================================
    LoginRateLimitPolicy,
    EmailOperationRateLimitPolicy,

    // ========================================
    // Use Cases
    // ========================================
    // Login/Logout/Refresh
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
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
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
    // Exportar services si otros módulos los necesitan
    TokensService,
    ResetPasswordTokenService,
    TwoFactorTokenService,
    // Exportar guards para uso manual si es necesario
    JwtAuthGuard,
  ],
})
export class AuthModule {}
