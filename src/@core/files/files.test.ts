/**
 * Files Module - Test & Development Tool
 *
 * Herramienta para testing del servicio de archivos con múltiples modos:
 * - upload: Subir un archivo de prueba
 * - delete: Eliminar un archivo
 * - exists: Verificar si un archivo existe
 * - url: Obtener URL de un archivo
 * - replace: Reemplazar un archivo existente
 * - all: Probar todas las operaciones
 *
 * Uso:
 *   npm run files:test                    # Probar todas las operaciones
 *   npm run files:test upload             # Subir archivo de prueba
 *   npm run files:test upload image       # Subir imagen de prueba
 *   npm run files:test upload pdf         # Subir PDF de prueba
 *   npm run files:test delete documents/test.pdf
 *   npm run files:test exists documents/test.pdf
 *   npm run files:test url documents/test.pdf
 *   npm run files:test replace            # Reemplazar archivo
 */

import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../app.module'
import { FilesService } from './files.service'
import { FileType } from './enums/file-type.enum'
import { Readable } from 'stream'
import chalk from 'chalk'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Crea un archivo de prueba en memoria
 */
function createMockFile(type: 'image' | 'pdf' | 'text'): Express.Multer.File {
  const files = {
    image: {
      originalname: 'test-image.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
      size: 95,
    },
    pdf: {
      originalname: 'test-document.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF',
      ),
      size: 200,
    },
    text: {
      originalname: 'test-file.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('Este es un archivo de prueba para testing.'),
      size: 43,
    },
  }

  const fileData = files[type]

  return {
    fieldname: 'file',
    originalname: fileData.originalname,
    encoding: '7bit',
    mimetype: fileData.mimetype,
    size: fileData.size,
    buffer: fileData.buffer,
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  }
}

/**
 * Verifica que el directorio de uploads esté configurado
 */
function checkConfiguration() {
  const uploadsDir = process.env.UPLOADS_DIR
  const appUrl = process.env.APP_URL

  if (!uploadsDir) {
    console.log(chalk.yellow('\n⚠️  UPLOADS_DIR no está configurado en .env'))
    console.log(chalk.white('   Usando valor por defecto: ./uploads\n'))
  }

  if (!appUrl) {
    console.log(chalk.yellow('\n⚠️  APP_URL no está configurado en .env'))
    console.log(
      chalk.white('   Usando valor por defecto: http://localhost:3001\n'),
    )
  }

  console.log(chalk.cyan('📁 Configuración:'))
  console.log(
    chalk.white('   UPLOADS_DIR:'),
    chalk.yellow(uploadsDir || './uploads'),
  )
  console.log(
    chalk.white('   APP_URL:    '),
    chalk.yellow(appUrl || 'http://localhost:3001'),
  )
  console.log('')
}

// ============================================================================
// TEST OPERATIONS
// ============================================================================

/**
 * Prueba subir un archivo
 */
async function testUpload(
  filesService: FilesService,
  fileType: 'image' | 'pdf' | 'text' = 'image',
) {
  console.log(chalk.green(`\n📤 Subiendo archivo de prueba (${fileType})...`))

  const mockFile = createMockFile(fileType)

  const result = await filesService.uploadFile({
    file: mockFile,
    folder: 'test-uploads',
    validationOptions: {
      fileType:
        fileType === 'image'
          ? FileType.IMAGE
          : fileType === 'pdf'
            ? FileType.PDF
            : FileType.DOCUMENT,
      maxSize: 10 * 1024 * 1024, // 10MB
    },
  })

  console.log(chalk.white('   Archivo:  '), chalk.cyan(result.fileName))
  console.log(chalk.white('   Path:     '), chalk.cyan(result.filePath))
  console.log(chalk.white('   Tamaño:   '), chalk.cyan(`${result.size} bytes`))
  console.log(chalk.white('   MIME:     '), chalk.cyan(result.mimeType))
  console.log(chalk.white('   URL:      '), chalk.yellow(result.url))
  console.log(chalk.green('   ✓ Archivo subido exitosamente'))

  return result
}

/**
 * Prueba eliminar un archivo
 */
async function testDelete(filesService: FilesService, filePath: string) {
  console.log(chalk.green(`\n🗑️  Eliminando archivo: ${filePath}...`))

  const exists = await filesService.fileExists(filePath)

  if (!exists) {
    console.log(chalk.yellow('   ⚠️  El archivo no existe'))
    return
  }

  await filesService.deleteFile(filePath)
  console.log(chalk.green('   ✓ Archivo eliminado exitosamente'))
}

/**
 * Prueba verificar existencia de archivo
 */
async function testExists(filesService: FilesService, filePath: string) {
  console.log(chalk.green(`\n🔍 Verificando existencia: ${filePath}...`))

  const exists = await filesService.fileExists(filePath)

  if (exists) {
    console.log(chalk.green('   ✓ El archivo existe'))
  } else {
    console.log(chalk.yellow('   ⚠️  El archivo no existe'))
  }

  return exists
}

/**
 * Prueba obtener URL de archivo
 */
async function testGetUrl(filesService: FilesService, filePath: string) {
  console.log(chalk.green(`\n🔗 Obteniendo URL: ${filePath}...`))

  const url = filesService.getFileUrl(filePath)

  console.log(chalk.white('   URL:'), chalk.yellow(url))

  const exists = await filesService.fileExists(filePath)
  if (!exists) {
    console.log(chalk.yellow('   ⚠️  Nota: El archivo no existe físicamente'))
  }

  return url
}

/**
 * Prueba reemplazar un archivo
 */
async function testReplace(filesService: FilesService) {
  console.log(chalk.green('\n🔄 Probando reemplazo de archivo...'))

  // 1. Subir archivo inicial
  console.log(chalk.white('\n   1️⃣  Subiendo archivo inicial...'))
  const mockFile1 = createMockFile('image')
  const result1 = await filesService.uploadFile({
    file: mockFile1,
    folder: 'test-uploads',
    customFileName: 'avatar-old',
    validationOptions: {
      fileType: FileType.IMAGE,
      maxSize: 10 * 1024 * 1024,
    },
  })

  console.log(
    chalk.white('      Archivo inicial:'),
    chalk.cyan(result1.filePath),
  )

  // 2. Reemplazar con nuevo archivo
  console.log(chalk.white('\n   2️⃣  Reemplazando con nuevo archivo...'))
  const mockFile2 = createMockFile('image')
  const result2 = await filesService.replaceFile(result1.filePath, {
    file: mockFile2,
    folder: 'test-uploads',
    customFileName: 'avatar-new',
    validationOptions: {
      fileType: FileType.IMAGE,
      maxSize: 10 * 1024 * 1024,
    },
  })

  console.log(
    chalk.white('      Nuevo archivo:  '),
    chalk.cyan(result2.filePath),
  )

  // 3. Verificar que el antiguo fue eliminado
  const oldExists = await filesService.fileExists(result1.filePath)
  console.log(
    chalk.white('\n   3️⃣  Verificando eliminación del antiguo:'),
    oldExists ? chalk.red('✗ Aún existe') : chalk.green('✓ Eliminado'),
  )

  console.log(chalk.green('\n   ✓ Reemplazo completado exitosamente'))

  return result2
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Ejecuta modo upload
 */
async function runUpload(fileType: 'image' | 'pdf' | 'text' = 'image') {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📤 Files Service - Subir Archivo'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  await testUpload(filesService, fileType)

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Ejecuta modo delete
 */
async function runDelete(filePath: string) {
  if (!filePath) {
    console.error(chalk.red('\n❌ Debes especificar la ruta del archivo'))
    console.log(chalk.yellow('\nUso:'))
    console.log(chalk.white('  npm run files:test delete documents/test.pdf'))
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🗑️  Files Service - Eliminar Archivo'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  await testDelete(filesService, filePath)

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Ejecuta modo exists
 */
async function runExists(filePath: string) {
  if (!filePath) {
    console.error(chalk.red('\n❌ Debes especificar la ruta del archivo'))
    console.log(chalk.yellow('\nUso:'))
    console.log(chalk.white('  npm run files:test exists documents/test.pdf'))
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🔍 Files Service - Verificar Existencia'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  await testExists(filesService, filePath)

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Ejecuta modo url
 */
async function runGetUrl(filePath: string) {
  if (!filePath) {
    console.error(chalk.red('\n❌ Debes especificar la ruta del archivo'))
    console.log(chalk.yellow('\nUso:'))
    console.log(chalk.white('  npm run files:test url documents/test.pdf'))
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🔗 Files Service - Obtener URL'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  await testGetUrl(filesService, filePath)

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Ejecuta modo replace
 */
async function runReplace() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🔄 Files Service - Reemplazar Archivo'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  await testReplace(filesService)

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))

  await app.close()
}

/**
 * Ejecuta todas las pruebas
 */
async function runAll() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📁 Files Service - Prueba Completa'))
  console.log(chalk.cyan('═'.repeat(70)))

  checkConfiguration()

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  const filesService = app.get(FilesService)

  let successCount = 0
  let errorCount = 0

  // Test 1: Upload image
  try {
    const imageResult = await testUpload(filesService, 'image')
    successCount++

    // Test 2: Exists
    await testExists(filesService, imageResult.filePath)
    successCount++

    // Test 3: Get URL
    await testGetUrl(filesService, imageResult.filePath)
    successCount++

    // Test 4: Upload PDF
    const pdfResult = await testUpload(filesService, 'pdf')
    successCount++

    // Test 5: Upload text
    const textResult = await testUpload(filesService, 'text')
    successCount++

    // Test 6: Replace
    await testReplace(filesService)
    successCount++

    // Test 7: Delete uploaded files
    await testDelete(filesService, imageResult.filePath)
    successCount++

    await testDelete(filesService, pdfResult.filePath)
    successCount++

    await testDelete(filesService, textResult.filePath)
    successCount++
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(chalk.red(`\n❌ Error: ${errorMessage}`))
    errorCount++
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(
    chalk.bold.green(
      `  ✓ Completado: ${successCount} exitosos, ${errorCount} errores`,
    ),
  )
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  console.log(chalk.yellow('💡 Tips:'))
  console.log(
    chalk.white(
      '  - Archivos de prueba se guardan en la carpeta test-uploads/',
    ),
  )
  console.log(
    chalk.white('  - Configura UPLOADS_DIR en .env para cambiar ubicación'),
  )
  console.log(chalk.white('  - Configura APP_URL en .env para URLs correctas'))
  console.log(
    chalk.white('  - Los archivos se eliminan automáticamente al final'),
  )
  console.log('')

  await app.close()
}

/**
 * Muestra ayuda
 */
function showHelp() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📁 Files Module - Herramienta de Testing'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  console.log(chalk.yellow('🚀 Comandos:\n'))
  console.log(chalk.white('  Probar todas las operaciones:'))
  console.log(chalk.green('    npm run files:test'))
  console.log('')
  console.log(chalk.white('  Subir archivos de prueba:'))
  console.log(chalk.green('    npm run files:test upload         # Imagen'))
  console.log(chalk.green('    npm run files:test upload image   # Imagen'))
  console.log(chalk.green('    npm run files:test upload pdf     # PDF'))
  console.log(chalk.green('    npm run files:test upload text    # Texto'))
  console.log('')
  console.log(chalk.white('  Eliminar archivo:'))
  console.log(
    chalk.green('    npm run files:test delete test-uploads/file.jpg'),
  )
  console.log('')
  console.log(chalk.white('  Verificar existencia:'))
  console.log(
    chalk.green('    npm run files:test exists test-uploads/file.jpg'),
  )
  console.log('')
  console.log(chalk.white('  Obtener URL:'))
  console.log(chalk.green('    npm run files:test url test-uploads/file.jpg'))
  console.log('')
  console.log(chalk.white('  Reemplazar archivo:'))
  console.log(chalk.green('    npm run files:test replace'))
  console.log('')

  console.log(chalk.yellow('⚙️  Variables de entorno (.env):\n'))
  console.log(
    chalk.cyan(`  UPLOADS_DIR=./uploads
  APP_URL=http://localhost:3001`),
  )
  console.log('')

  console.log(chalk.yellow('📦 Tipos de archivo soportados:\n'))
  console.log(chalk.white('  🖼️  image - Imagen JPEG de prueba (1x1 pixel)'))
  console.log(chalk.white('  📄  pdf   - Documento PDF de prueba'))
  console.log(chalk.white('  📝  text  - Archivo de texto de prueba'))
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
      case 'all':
        await runAll()
        break

      case 'upload': {
        const fileType = (arg as 'image' | 'pdf' | 'text') || ('image' as const)
        if (!['image', 'pdf', 'text'].includes(fileType)) {
          console.error(chalk.red('\n❌ Tipo de archivo inválido:'), fileType)
          console.log(chalk.yellow('\n💡 Tipos válidos: image, pdf, text'))
          process.exit(1)
        }
        await runUpload(fileType)
        break
      }

      case 'delete':
        await runDelete(arg)
        break

      case 'exists':
        await runExists(arg)
        break

      case 'url':
        await runGetUrl(arg)
        break

      case 'replace':
        await runReplace()
        break

      case 'help':
      case '--help':
      case '-h':
        showHelp()
        break

      default:
        console.error(chalk.red('\n❌ Comando inválido:'), mode)
        showHelp()
        process.exit(1)
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
void main()
