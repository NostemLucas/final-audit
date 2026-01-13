import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@core/logger'
import * as nodemailer from 'nodemailer'
import * as path from 'path'
import {
  SendEmailOptions,
  TwoFactorEmailData,
  ResetPasswordEmailData,
  WelcomeEmailData,
  VerifyEmailData,
} from './interfaces'
import { ImageHelper } from './utils'

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
  private readonly logoBase64: string | null
  private readonly logoUrl: string | null

  constructor(
    private readonly logger: LoggerService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') || 'noreply@audit2.com'
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'Audit2'
    this.appName = this.configService.get<string>('APP_NAME') || 'Audit2'

    // Opción 1: Logo Base64 (recomendado)
    // Buscar logo en assets/images/logo.png
    const logoPath = path.join(process.cwd(), 'assets', 'images', 'logo.png')

    if (ImageHelper.imageExists(logoPath)) {
      this.logoBase64 = ImageHelper.imageToBase64(logoPath)
      const size = ImageHelper.getImageSizeFormatted(logoPath)
      this.logger.log(`✅ Logo cargado para emails (${size})`)
    } else {
      this.logoBase64 = null
      this.logger.warn(
        `⚠️  Logo no encontrado en: ${logoPath}. Los emails no tendrán logo.`,
      )
      this.logger.warn(
        `   Coloca tu logo en: assets/images/logo.png para que aparezca en los emails.`,
      )
    }

    // Opción 2: Logo por URL (alternativa)
    this.logoUrl = this.configService.get<string>('LOGO_URL') || null
  }

  /**
   * Método privado para enviar emails
   */
  private async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.mailerService.sendMail({
        to: options.to,
        from: `"${this.fromName}" <${this.fromEmail}>`,
        subject: options.subject,
        template: options.template,
        context: {
          ...options.context,
          appName: this.appName,
          currentYear: new Date().getFullYear(),
          // Logos disponibles en todos los templates
          logoBase64: this.logoBase64,
          logoUrl: this.logoUrl,
        },
      })

      this.logger.log(
        `Email enviado exitosamente a ${options.to}: ${options.subject}`,
      )

      // En desarrollo, mostrar preview URL
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production'
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (isDevelopment && info.messageId) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const previewUrl = nodemailer.getTestMessageUrl(info)
        if (previewUrl) {
          this.logger.log(`📧 Preview: ${previewUrl}`)
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      this.logger.error(
        `Error enviando email a ${options.to}: ${errorMessage}`,
        errorStack,
      )
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
