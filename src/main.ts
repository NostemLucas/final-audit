import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { LoggerService } from '@core/logger'
import cookieParser from 'cookie-parser'
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const logger = app.get(LoggerService)
  const port = Number(process.env.PORT) || 3001
  app.useLogger(logger)

  // Configurar archivos estáticos para uploads
  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads')
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    index: false, // Deshabilitar index.html automático
  })
  logger.log(`📁 Archivos estáticos servidos desde: ${uploadsDir}`)
  logger.log(`🌐 URL de acceso: http://localhost:${port}/uploads/`)

  // Configurar CORS
  const corsOrigin = process.env.CORS_ORIGIN || '*'
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  })
  logger.log(`🔓 CORS habilitado para: ${corsOrigin}`)

  // Middleware para parsear cookies (requerido para refresh tokens)
  app.use(cookieParser())

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('ATR API')
    .setDescription(
      'API de auditorías, plantillas, frameworks de madurez y gestión de usuarios',
    )
    .setVersion('1.0')
    .addTag('Auth', 'Autenticación JWT con refresh tokens')
    .addTag('users', 'Gestión de usuarios')
    .addTag('notifications', 'Sistema de notificaciones')
    .addTag('templates', 'Gestión de plantillas (ISO 27001, ISO 9001, etc.)')
    .addTag('standards', 'Gestión de normas con estructura jerárquica')
    .addTag(
      'frameworks',
      'Frameworks de madurez/ponderación (COBIT 5, CMMI, etc.)',
    )
    .addTag('maturity-levels', 'Niveles de madurez con textos predefinidos')
    .addTag(
      'audits',
      'Gestión de auditorías (inicial, seguimiento, recertificación)',
    )
    .addTag('evaluations', 'Evaluación de normas con niveles de madurez')
    .addTag('action-plans', 'Planes de acción para remediar no conformidades')
    .build()
  logger.startup.printStartupBanner(
    {
      appName: 'Audit API',
      version: '1.0.0',
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
      apiPrefix: '/api/docs',
    },
    {
      type: 'PostgreSQL',
      host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0],
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[1],
    },
  )
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT ?? port)
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap()
