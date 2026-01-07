/**
 * Email Module - Test & Development Tool
 *
 * Herramienta consolidada para testing de emails con múltiples modos:
 * - setup: Configurar cuenta de prueba Ethereal
 * - all: Probar todos los tipos de email
 * - [tipo]: Probar un tipo específico (welcome, verify, 2fa, reset)
 * - custom: Probar un template personalizado
 *
 * Uso:
 *   npm run email:test setup           # Configurar Ethereal
 *   npm run email:test                 # Probar todos los emails
 *   npm run email:test welcome         # Probar email de bienvenida
 *   npm run email:test custom mi-template
 */

import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../app.module'
import { EmailService } from './email.service'
import * as nodemailer from 'nodemailer'
import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Crea una cuenta de prueba de Ethereal Email
 */
async function createEtherealAccount() {
  const testAccount = await nodemailer.createTestAccount()

  console.log(chalk.cyan('━'.repeat(70)))
  console.log(chalk.bold.cyan('📧 Cuenta de prueba de Ethereal Email creada'))
  console.log(chalk.cyan('━'.repeat(70)))
  console.log(chalk.white('Host:    '), chalk.yellow(testAccount.smtp.host))
  console.log(chalk.white('Port:    '), chalk.yellow(testAccount.smtp.port))
  console.log(chalk.white('Secure:  '), chalk.yellow(testAccount.smtp.secure))
  console.log(chalk.white('User:    '), chalk.yellow(testAccount.user))
  console.log(chalk.white('Password:'), chalk.yellow(testAccount.pass))
  console.log(chalk.cyan('━'.repeat(70)))
  console.log('')

  return {
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    user: testAccount.user,
    password: testAccount.pass,
  }
}

/**
 * Guarda las credenciales en un archivo .env.email-test
 */
function saveCredentials(
  credentials: ReturnType<typeof createEtherealAccount> extends Promise<infer T>
    ? T
    : never,
) {
  const envContent = `# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Email Configuration (Ethereal Test Account)
# Generado: ${new Date().toISOString()}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAIL_HOST=${credentials.host}
MAIL_PORT=${credentials.port}
MAIL_SECURE=${credentials.secure}
MAIL_USER=${credentials.user}
MAIL_PASSWORD=${credentials.password}
MAIL_FROM=noreply@audit-core.com
MAIL_FROM_NAME=Audit Core

APP_NAME=Audit Core
TEST_EMAIL=test@example.com`

  const envFilePath = path.join(process.cwd(), '.env.email-test')
  fs.writeFileSync(envFilePath, envContent)

  console.log(
    chalk.green('✓ Configuración guardada en:'),
    chalk.white('.env.email-test'),
  )
  console.log('')
  console.log(chalk.yellow('📝 Siguientes pasos:'))
  console.log(
    chalk.white('  1. Copia el contenido de .env.email-test a tu archivo .env'),
  )
  console.log(chalk.white('  2. O renombra .env.email-test a .env'))
  console.log('')
  console.log(chalk.yellow('🧪 Para probar:'))
  console.log(chalk.white('  npm run email:test'))
  console.log('')
  console.log(chalk.yellow('🌐 Ver emails enviados:'))
  console.log(chalk.cyan('  https://ethereal.email/login'))
  console.log(chalk.white(`  Usuario: ${credentials.user}`))
  console.log(chalk.white(`  Password: ${credentials.password}`))
  console.log('')
}

// ============================================================================
// EMAIL TEST DEFINITIONS
// ============================================================================

interface EmailTest {
  name: string
  icon: string
  send: (emailService: EmailService, to: string) => Promise<void>
}

const EMAIL_TESTS: Record<string, EmailTest> = {
  welcome: {
    name: 'Email de Bienvenida',
    icon: '👋',
    async send(emailService: EmailService, to: string) {
      await emailService.sendWelcomeEmail({
        to,
        userName: 'Juan Pérez',
        loginLink: 'https://audit-core.com/login',
      })
    },
  },

  verify: {
    name: 'Email de Verificación',
    icon: '✉️',
    async send(emailService: EmailService, to: string) {
      await emailService.sendVerificationEmail({
        to,
        userName: 'María García',
        verificationLink: 'https://audit-core.com/verify?token=abc123xyz',
      })
    },
  },

  '2fa': {
    name: 'Código 2FA',
    icon: '🔐',
    async send(emailService: EmailService, to: string) {
      await emailService.sendTwoFactorCode({
        to,
        userName: 'Carlos Rodríguez',
        code: '123456',
        expiresInMinutes: 10,
      })
    },
  },

  reset: {
    name: 'Recuperación de Contraseña',
    icon: '🔑',
    async send(emailService: EmailService, to: string) {
      await emailService.sendResetPasswordEmail({
        to,
        userName: 'Ana Martínez',
        resetLink: 'https://audit-core.com/reset-password?token=xyz789abc',
        expiresInMinutes: 30,
      })
    },
  },
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Modo: Setup de Ethereal
 */
async function runSetup() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📧 Configuración de Email de Prueba'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  try {
    console.log(chalk.yellow('⏳ Creando cuenta en Ethereal Email...\n'))
    const credentials = await createEtherealAccount()
    saveCredentials(credentials)
    console.log(chalk.cyan('═'.repeat(70) + '\n'))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(chalk.red('\n❌ Error creando cuenta:'), errorMessage)
    console.log('')
    console.log(chalk.yellow('💡 Alternativa:'))
    console.log(chalk.white('  1. Visita https://ethereal.email/create'))
    console.log(chalk.white('  2. Crea una cuenta manualmente'))
    console.log(chalk.white('  3. Copia las credenciales a tu .env'))
    console.log('')
    process.exit(1)
  }
}

/**
 * Modo: Probar un solo email
 */
async function runSingleTest(type: string) {
  const test = EMAIL_TESTS[type]

  if (!test) {
    console.error(chalk.red('\n❌ Tipo de email inválido:'), type)
    console.log(chalk.yellow('\n💡 Tipos disponibles:'))
    Object.entries(EMAIL_TESTS).forEach(([key, t]) => {
      console.log(chalk.white(`  - ${key.padEnd(10)} ${t.icon} ${t.name}`))
    })
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan(`  ${test.icon} Probando: ${test.name}`))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const emailService = app.get(EmailService)
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'

  console.log(chalk.yellow('📨 Destinatario:'), chalk.white(testEmail))
  console.log(chalk.yellow('⏳ Enviando...\n'))

  await test.send(emailService, testEmail)

  console.log(chalk.green('✓ Email enviado exitosamente\n'))
  console.log(chalk.yellow('💡 Revisa los logs para ver la URL de preview'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Modo: Probar todos los emails
 */
async function runAllTests() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📧 Email Service - Probando Todos los Emails'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const emailService = app.get(EmailService)
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'

  console.log(chalk.yellow('📨 Destinatario:'), chalk.white(testEmail))
  console.log('')

  let successCount = 0
  let errorCount = 0

  for (const [, test] of Object.entries(EMAIL_TESTS)) {
    console.log(chalk.green(`${test.icon} ${test.name}...`))
    try {
      await test.send(emailService, testEmail)
      console.log(chalk.green(`  ✓ Enviado\n`))
      successCount++
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(chalk.red(`  ✖ Error: ${errorMessage}\n`))
      errorCount++
    }
  }

  console.log(chalk.cyan('═'.repeat(70)))
  console.log(
    chalk.bold.green(
      `  ✓ Completado: ${successCount} exitosos, ${errorCount} errores`,
    ),
  )
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  console.log(chalk.yellow('💡 Tips:'))
  console.log(
    chalk.white('  - En desarrollo, usa Ethereal Email para ver los emails'),
  )
  console.log(chalk.white('  - Revisa los logs para ver las URLs de preview'))
  console.log(chalk.white('  - Templates en: src/@core/email/templates/'))
  console.log('')

  await app.close()
}

/**
 * Modo: Probar template personalizado
 */
async function runCustomTemplateTest(templateName: string) {
  if (!templateName) {
    console.error(chalk.red('\n❌ Debes especificar el nombre del template'))
    console.log(chalk.yellow('\nUso:'))
    console.log(chalk.white('  npm run email:test custom mi-template'))
    console.log('')
    process.exit(1)
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`)
  if (!fs.existsSync(templatePath)) {
    console.error(chalk.red('\n❌ Template no encontrado:'), templatePath)
    console.log(chalk.yellow('\n💡 Crear template primero:'))
    console.log(chalk.white('  npm run email:template:create'))
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan(`  📧 Probando Template: ${templateName}`))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const emailService = app.get(EmailService)
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'

  console.log(chalk.yellow('📨 Destinatario:'), chalk.white(testEmail))
  console.log(chalk.yellow('📄 Template:'), chalk.white(templatePath))
  console.log(chalk.yellow('⏳ Enviando...\n'))

  await emailService.sendCustomEmail(
    testEmail,
    `Prueba de Template: ${templateName}`,
    templateName,
    {
      userName: 'Usuario de Prueba',
      message: `Este es un email de prueba usando el template "${templateName}"`,
      actionUrl: 'https://audit-core.com/dashboard',
      actionText: 'Ver Dashboard',
    },
  )

  console.log(chalk.green('✓ Email enviado exitosamente\n'))
  console.log(chalk.yellow('💡 Revisa los logs para ver la URL de preview'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Muestra ayuda
 */
function showHelp() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📧 Email Module - Herramienta de Testing'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  console.log(chalk.yellow('🚀 Comandos:\n'))
  console.log(chalk.white('  Setup inicial:'))
  console.log(chalk.green('    npm run email:test setup'))
  console.log('')
  console.log(chalk.white('  Probar todos los emails:'))
  console.log(chalk.green('    npm run email:test'))
  console.log('')
  console.log(chalk.white('  Probar email específico:'))
  console.log(chalk.green('    npm run email:test welcome'))
  console.log(chalk.green('    npm run email:test verify'))
  console.log(chalk.green('    npm run email:test 2fa'))
  console.log(chalk.green('    npm run email:test reset'))
  console.log('')
  console.log(chalk.white('  Probar template personalizado:'))
  console.log(chalk.green('    npm run email:test custom mi-template'))
  console.log('')
  console.log(chalk.white('  Crear template nuevo:'))
  console.log(chalk.green('    npm run email:template:create'))
  console.log('')

  console.log(chalk.yellow('📨 Tipos de email disponibles:\n'))
  Object.entries(EMAIL_TESTS).forEach(([key, test]) => {
    console.log(chalk.white(`  ${test.icon} ${key.padEnd(10)} - ${test.name}`))
  })
  console.log('')

  console.log(chalk.yellow('⚙️  Variables de entorno (.env):\n'))
  console.log(
    chalk.cyan(`  MAIL_HOST=smtp.ethereal.email
  MAIL_PORT=587
  MAIL_SECURE=false
  MAIL_USER=tu-usuario@ethereal.email
  MAIL_PASSWORD=tu-password
  MAIL_FROM=noreply@audit-core.com
  MAIL_FROM_NAME=Audit Core
  APP_NAME=Audit Core
  TEST_EMAIL=test@example.com`),
  )
  console.log('')

  console.log(chalk.cyan('═'.repeat(70) + '\n'))
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const mode = process.argv[2] || 'all'
  const arg = process.argv[3]

  try {
    switch (mode) {
      case 'setup':
        await runSetup()
        break

      case 'all':
        await runAllTests()
        break

      case 'custom':
        await runCustomTemplateTest(arg)
        break

      case 'help':
      case '--help':
      case '-h':
        showHelp()
        break

      default:
        // Intentar como tipo de email
        if (EMAIL_TESTS[mode]) {
          await runSingleTest(mode)
        } else {
          console.error(chalk.red('\n❌ Comando inválido:'), mode)
          showHelp()
          process.exit(1)
        }
    }

    process.exit(0)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(chalk.red('\n❌ Error:'), errorMessage)
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack))
    }
    process.exit(1)
  }
}

// Ejecutar
main()
