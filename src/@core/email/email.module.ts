import { Global, Module } from '@nestjs/common'
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { join } from 'path'
import { EmailService } from './email.service'

@Global()
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production'

        return {
          transport: {
            host: configService.get<string>('MAIL_HOST'),
            port: parseInt(configService.get<string>('MAIL_PORT') || '587', 10),
            secure: configService.get<string>('MAIL_SECURE') === 'true',
            auth: {
              user: configService.get<string>('MAIL_USER'),
              pass: configService.get<string>('MAIL_PASSWORD'),
            },
          },
          defaults: {
            from: `"${configService.get<string>('MAIL_FROM_NAME') || 'Audit2'}" <${configService.get<string>('MAIL_FROM') || 'noreply@audit2.com'}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          // Preview de emails en desarrollo (opcional)
          preview: !isProduction,
        }
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
