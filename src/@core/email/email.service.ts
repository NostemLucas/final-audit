import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@core/logger'

interface SendEmailOptions {
  to: string
  subject: string
  template: string
  context: Record<string, unknown>
}

interface TwoFactorEmailData {
  to: string
  userName: string
  code: string
  expiresInMinutes: number
}

interface ResetPasswordEmailData {
  to: string
  userName: string
  resetLink: string
  expiresInMinutes: number
}

interface WelcomeEmailData {
  to: string
  userName: string
  loginLink: string
}

interface VerifyEmailData {
  to: string
  userName: string
  verificationLink: string
}

/**
 * Servicio para envío de emails con templates HTML
 *
 * Métodos disponibles:
 * - sendTwoFactorCode: Envía código de autenticación de dos factores
 * - sendResetPasswordEmail: Envía link de recuperación de contraseña
 * - sendWelcomeEmail: Envía email de bienvenida a nuevos usuarios
 * - sendVerificationEmail: Envía email de verificación de cuenta
 */
@Injectable()
export class EmailService {
  private readonly fromEmail: string
  private readonly fromName: string
  private readonly appName: string

  constructor(
    private readonly logger: LoggerService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') || 'noreply@audit2.com'
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Audit2'
    this.appName = this.configService.get<string>('APP_NAME') || 'Audit2'
  }

  /**
   * Método privado para enviar emails
   */
  private async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const info = await this.mailerService.sendMail({
        to: options.to,
        from: `"${this.fromName}" <${this.fromEmail}>`,
        subject: options.subject,
        template: options.template,
        context: {
          ...options.context,
          appName: this.appName,
          currentYear: new Date().getFullYear(),
        },
      })

      this.logger.log(
        `Email enviado exitosamente a ${options.to}: ${options.subject}`,
      )

      // En desarrollo, mostrar preview URL
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production'
      if (isDevelopment && info.messageId) {
        const nodemailer = require('nodemailer')
        const previewUrl = nodemailer.getTestMessageUrl(info)
        if (previewUrl) {
          this.logger.log(`📧 Preview: ${previewUrl}`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      this.logger.error(`Error enviando email a ${options.to}: ${errorMessage}`, errorStack)
      throw new Error(`Error al enviar email: ${errorMessage}`)
    }
  }

  /**
   * Envía código de autenticación de dos factores
   */
  async sendTwoFactorCode(data: TwoFactorEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Código de verificación - ${this.appName}`,
      template: 'two-factor-code',
      context: {
        userName: data.userName,
        code: data.code,
        expiresInMinutes: data.expiresInMinutes,
      },
    })
  }

  /**
   * Envía link de recuperación de contraseña
   */
  async sendResetPasswordEmail(data: ResetPasswordEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Recuperar contraseña - ${this.appName}`,
      template: 'reset-password',
      context: {
        userName: data.userName,
        resetLink: data.resetLink,
        expiresInMinutes: data.expiresInMinutes,
      },
    })
  }

  /**
   * Envía email de bienvenida a nuevos usuarios
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `¡Bienvenido a ${this.appName}!`,
      template: 'welcome',
      context: {
        userName: data.userName,
        loginLink: data.loginLink,
      },
    })
  }

  /**
   * Envía email de verificación de cuenta
   */
  async sendVerificationEmail(data: VerifyEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Verificar cuenta - ${this.appName}`,
      template: 'verify-email',
      context: {
        userName: data.userName,
        verificationLink: data.verificationLink,
      },
    })
  }

  /**
   * Método genérico para enviar emails personalizados
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.sendEmail({ to, subject, template, context })
  }
}
