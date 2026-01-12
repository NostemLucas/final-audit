/**
 * Script de Verificación - Sistema de Archivos
 *
 * Verifica que el sistema de archivos esté configurado correctamente
 * antes de usarlo en producción.
 *
 * Uso:
 *   npm run files:verify
 */

import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Cargar variables de entorno desde .env
config()

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  fix?: string
}

const results: CheckResult[] = []

function printHeader() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🔍 Verificación del Sistema de Archivos'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))
}

function addCheck(result: CheckResult) {
  results.push(result)

  const icon =
    result.status === 'pass'
      ? chalk.green('✓')
      : result.status === 'fail'
        ? chalk.red('✗')
        : chalk.yellow('⚠')

  const statusColor =
    result.status === 'pass'
      ? chalk.green
      : result.status === 'fail'
        ? chalk.red
        : chalk.yellow

  console.log(`${icon} ${chalk.white(result.name)}`)
  console.log(`  ${statusColor(result.message)}`)

  if (result.fix) {
    console.log(`  ${chalk.gray('→')} ${chalk.white(result.fix)}`)
  }

  console.log('')
}

function checkEnvVariables() {
  console.log(chalk.bold('📋 Verificando variables de entorno...\n'))

  // Check UPLOADS_DIR
  const uploadsDir = process.env.UPLOADS_DIR
  if (uploadsDir) {
    addCheck({
      name: 'UPLOADS_DIR configurado',
      status: 'pass',
      message: `Configurado: ${uploadsDir}`,
    })
  } else {
    addCheck({
      name: 'UPLOADS_DIR no configurado',
      status: 'warning',
      message: 'Se usará valor por defecto: ./uploads',
      fix: 'Agrega UPLOADS_DIR=./uploads a tu archivo .env',
    })
  }

  // Check APP_URL
  const appUrl = process.env.APP_URL
  if (appUrl) {
    addCheck({
      name: 'APP_URL configurado',
      status: 'pass',
      message: `Configurado: ${appUrl}`,
    })
  } else {
    addCheck({
      name: 'APP_URL no configurado',
      status: 'warning',
      message: 'Se usará valor por defecto: http://localhost:3001',
      fix: 'Agrega APP_URL=http://localhost:3001 a tu archivo .env',
    })
  }
}

function checkUploadsDirectory() {
  console.log(chalk.bold('📁 Verificando directorio de uploads...\n'))

  const uploadsDir =
    process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

  // Check if directory exists
  if (fs.existsSync(uploadsDir)) {
    addCheck({
      name: 'Directorio uploads existe',
      status: 'pass',
      message: `Path: ${uploadsDir}`,
    })

    // Check permissions
    try {
      fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK)
      addCheck({
        name: 'Permisos de escritura',
        status: 'pass',
        message: 'El directorio tiene permisos de lectura/escritura',
      })
    } catch {
      addCheck({
        name: 'Permisos insuficientes',
        status: 'fail',
        message: 'No hay permisos de lectura/escritura',
        fix: `Ejecuta: chmod 755 ${uploadsDir}`,
      })
    }

    // Check if it's writable by trying to create a test file
    const testFile = path.join(uploadsDir, '.test-write')
    try {
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      addCheck({
        name: 'Test de escritura',
        status: 'pass',
        message: 'Se puede escribir en el directorio',
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      addCheck({
        name: 'Test de escritura falló',
        status: 'fail',
        message: errorMessage,
        fix: `Verifica permisos: chmod -R 755 ${uploadsDir}`,
      })
    }
  } else {
    addCheck({
      name: 'Directorio uploads no existe',
      status: 'fail',
      message: `Path esperado: ${uploadsDir}`,
      fix: `Ejecuta: mkdir -p ${uploadsDir} && chmod 755 ${uploadsDir}`,
    })
  }
}

function checkMainConfiguration() {
  console.log(chalk.bold('⚙️  Verificando configuración de main.ts...\n'))

  const mainPath = path.join(process.cwd(), 'src', 'main.ts')

  if (!fs.existsSync(mainPath)) {
    addCheck({
      name: 'main.ts no encontrado',
      status: 'fail',
      message: 'No se pudo encontrar src/main.ts',
    })
    return
  }

  const mainContent = fs.readFileSync(mainPath, 'utf-8')

  // Check for useStaticAssets
  if (mainContent.includes('useStaticAssets')) {
    addCheck({
      name: 'Archivos estáticos configurados',
      status: 'pass',
      message: 'useStaticAssets encontrado en main.ts',
    })
  } else {
    addCheck({
      name: 'Archivos estáticos NO configurados',
      status: 'fail',
      message: 'useStaticAssets no encontrado en main.ts',
      fix: 'Agrega app.useStaticAssets(uploadsDir, { prefix: "/uploads/" }) en main.ts',
    })
  }

  // Check for CORS
  if (mainContent.includes('enableCors')) {
    addCheck({
      name: 'CORS configurado',
      status: 'pass',
      message: 'enableCors encontrado en main.ts',
    })
  } else {
    addCheck({
      name: 'CORS no configurado',
      status: 'warning',
      message: 'CORS no está configurado (puede causar problemas con frontend)',
      fix: 'Agrega app.enableCors() en main.ts si usas frontend separado',
    })
  }

  // Check for NestExpressApplication
  if (mainContent.includes('NestExpressApplication')) {
    addCheck({
      name: 'NestExpressApplication importado',
      status: 'pass',
      message: 'Tipo correcto para useStaticAssets',
    })
  } else {
    addCheck({
      name: 'NestExpressApplication no importado',
      status: 'fail',
      message: 'Necesario para usar useStaticAssets',
      fix: 'Importa: import { NestExpressApplication } from "@nestjs/platform-express"',
    })
  }
}

function checkDependencies() {
  console.log(chalk.bold('📦 Verificando dependencias...\n'))

  const packageJsonPath = path.join(process.cwd(), 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    addCheck({
      name: 'package.json no encontrado',
      status: 'fail',
      message: 'No se pudo encontrar package.json',
    })
    return
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const requiredDeps = [
    { name: '@nestjs/platform-express', required: true },
    { name: 'multer', required: true },
    { name: '@types/multer', required: true },
    { name: 'sharp', required: true },
    { name: 'uuid', required: true },
  ]

  requiredDeps.forEach((dep) => {
    if (dependencies[dep.name]) {
      addCheck({
        name: `${dep.name} instalado`,
        status: 'pass',
        message: `Versión: ${dependencies[dep.name]}`,
      })
    } else if (dep.required) {
      addCheck({
        name: `${dep.name} NO instalado`,
        status: 'fail',
        message: 'Dependencia requerida no encontrada',
        fix: `Ejecuta: npm install ${dep.name}`,
      })
    }
  })
}

function printSummary() {
  console.log(chalk.cyan('═'.repeat(70)))

  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const warnings = results.filter((r) => r.status === 'warning').length

  console.log(chalk.bold.white('\n📊 Resumen de Verificación:\n'))
  console.log(`   ${chalk.green('✓ Pasados:')}   ${passed}`)
  console.log(`   ${chalk.red('✗ Fallados:')}  ${failed}`)
  console.log(`   ${chalk.yellow('⚠ Warnings:')}  ${warnings}`)
  console.log(`   ${chalk.white('━ Total:')}     ${results.length}\n`)

  if (failed === 0 && warnings === 0) {
    console.log(chalk.green.bold('🎉 ¡Verificación exitosa!'))
    console.log(
      chalk.white(
        '   El sistema de archivos está correctamente configurado.\n',
      ),
    )
    console.log(chalk.yellow('📝 Próximos pasos:'))
    console.log(chalk.white('   1. Ejecuta: npm run files:test'))
    console.log(chalk.white('   2. Inicia la app: npm run start:dev'))
    console.log(
      chalk.white(
        '   3. Prueba una URL: http://localhost:3001/uploads/test.jpg\n',
      ),
    )
  } else if (failed === 0) {
    console.log(chalk.yellow.bold('⚠️  Verificación con warnings'))
    console.log(
      chalk.white(
        '   El sistema puede funcionar, pero hay configuraciones recomendadas.\n',
      ),
    )
    console.log(
      chalk.yellow(
        '💡 Revisa los warnings arriba y aplica las correcciones sugeridas.\n',
      ),
    )
  } else {
    console.log(chalk.red.bold('❌ Verificación falló'))
    console.log(
      chalk.white(
        '   Hay problemas que deben ser corregidos antes de usar el sistema.\n',
      ),
    )
    console.log(chalk.yellow('💡 Correcciones sugeridas:\n'))

    results
      .filter((r) => r.status === 'fail' && r.fix)
      .forEach((r) => {
        console.log(chalk.white(`   • ${r.name}`))
        console.log(chalk.gray(`     ${r.fix}\n`))
      })
  }

  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  // Exit code
  process.exit(failed > 0 ? 1 : 0)
}

async function main() {
  printHeader()

  try {
    checkEnvVariables()
    checkUploadsDirectory()
    checkDependencies()
    checkMainConfiguration()

    printSummary()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      chalk.red('\n❌ Error durante la verificación:'),
      errorMessage,
    )
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack))
    }
    process.exit(1)
  }
}

// Ejecutar
void main()
