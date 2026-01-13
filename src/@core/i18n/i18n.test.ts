/**
 * i18n Module - Test & Development Tool
 *
 * Herramienta para probar el sistema de internacionalización con múltiples escenarios:
 * - all: Probar todos los escenarios
 * - [scenario]: Probar un escenario específico
 *
 * Uso:
 *   npm run i18n:test                  # Probar todos los escenarios
 *   npm run i18n:test translation      # Probar traducción automática
 *   npm run i18n:test transformers     # Probar transformers
 *   npm run i18n:test custom-field     # Probar nombres de campo personalizados
 */

import 'reflect-metadata'
import { validate, ValidationError } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import chalk from 'chalk'

// Import validators and transformers from i18n
import {
  IsString,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
  Matches,
  ToBoolean,
  ToNumber,
  ToStringArray,
  Trim,
  ToLowerCase,
} from './index'

// ============================================================================
// TEST DTOs
// ============================================================================

/**
 * DTO 1: Validación básica con traducción automática
 */
class UserBasicDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  names: string // Se traduce automáticamente a "nombres"

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastNames: string // Se traduce a "apellidos"

  @Trim()
  @ToLowerCase()
  @IsEmail()
  email: string // Se traduce a "correo electrónico"

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string // Se traduce a "nombre de usuario"
}

/**
 * DTO 2: Transformers
 */
class ConfigDto {
  @ToBoolean()
  @IsBoolean()
  enabled: boolean

  @ToNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxRetries: number

  @ToStringArray()
  @IsArray()
  @ArrayMinSize(1)
  tags: string[]
}

/**
 * DTO 3: Enums y UUIDs
 */
enum UserRole {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  CLIENTE = 'cliente',
}

class AssignRoleDto {
  @IsUUID('4')
  userId: string

  @IsEnum(UserRole)
  role: UserRole
}

/**
 * DTO 4: Nombre de campo personalizado
 */
class ProductDto {
  @MinLength(10, { fieldName: 'código del producto' })
  productCode: string

  @MinLength(5, { fieldName: 'nombre completo del producto' })
  fullName: string
}

/**
 * DTO 5: Validaciones numéricas
 */
class ScoreDto {
  @ToNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number // Se traduce a "puntuación" si está en FIELD_NAMES

  @ToNumber()
  @IsNumber()
  @Min(1)
  weight: number
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

interface TestScenario {
  name: string
  icon: string
  description: string
  run: () => Promise<void>
}

/**
 * Helper para validar y mostrar errores
 */
async function validateAndShow<T extends object>(
  dto: new () => T,
  data: Record<string, unknown>,
  transformOptions = { enableImplicitConversion: true },
): Promise<void> {
  console.log(chalk.cyan('  📋 Datos de entrada:'))
  console.log(
    chalk.gray(
      '    ' + JSON.stringify(data, null, 2).split('\n').join('\n    '),
    ),
  )
  console.log('')

  const instance = plainToInstance(dto, data, transformOptions)

  console.log(chalk.cyan('  🔄 Después de transformers:'))
  console.log(
    chalk.gray(
      '    ' + JSON.stringify(instance, null, 2).split('\n').join('\n    '),
    ),
  )
  console.log('')

  const errors = await validate(instance)

  if (errors.length === 0) {
    console.log(chalk.green('  ✓ Validación exitosa - Sin errores'))
  } else {
    console.log(chalk.yellow(`  ⚠ Errores encontrados: ${errors.length}`))
    console.log('')
    errors.forEach((error: ValidationError) => {
      const field = error.property
      console.log(chalk.yellow(`  - Campo: ${field}`))
      const constraints = error.constraints || {}
      Object.values(constraints).forEach((message) => {
        console.log(chalk.red(`    ✖ ${message}`))
      })
    })
  }
}

const TEST_SCENARIOS: Record<string, TestScenario> = {
  translation: {
    name: 'Traducción Automática de Campos',
    icon: '🌐',
    description:
      'Demuestra cómo los nombres de campos se traducen automáticamente',
    async run() {
      console.log(chalk.white('\n  📝 Escenario: Datos inválidos\n'))

      await validateAndShow(UserBasicDto, {
        names: 'J', // Muy corto (min 2)
        lastNames: '', // Vacío
        email: 'invalid-email', // Email inválido
        username: 'ab', // Muy corto (min 3)
      })

      console.log(chalk.white('\n  📝 Escenario: Datos válidos\n'))

      await validateAndShow(UserBasicDto, {
        names: 'Juan Carlos',
        lastNames: 'Pérez García',
        email: '  JUAN.PEREZ@EXAMPLE.COM  ', // Se transforma: trim + lowercase
        username: 'juan_perez',
      })
    },
  },

  transformers: {
    name: 'Transformers de Datos',
    icon: '🔄',
    description:
      'Demuestra cómo los transformers convierten automáticamente tipos',
    async run() {
      console.log(chalk.white('\n  📝 Escenario: Strings → Tipos nativos\n'))

      await validateAndShow(ConfigDto, {
        enabled: 'true', // String → Boolean
        maxRetries: '5', // String → Number
        tags: 'tag1,tag2,tag3', // String → Array
      })

      console.log(
        chalk.white('\n  📝 Escenario: Valores booleanos en español\n'),
      )

      await validateAndShow(ConfigDto, {
        enabled: 'si', // "si" → true
        maxRetries: '10',
        tags: ['production', 'active'],
      })

      console.log(
        chalk.white('\n  📝 Escenario: Validación numérica (fuera de rango)\n'),
      )

      await validateAndShow(ConfigDto, {
        enabled: true,
        maxRetries: '150', // Excede max (100)
        tags: [],
      })
    },
  },

  enums: {
    name: 'Validación de Enums y UUIDs',
    icon: '🏷️',
    description: 'Demuestra validación de enums y UUIDs',
    async run() {
      console.log(chalk.white('\n  📝 Escenario: UUID inválido\n'))

      await validateAndShow(AssignRoleDto, {
        userId: 'invalid-uuid',
        role: 'admin',
      })

      console.log(chalk.white('\n  📝 Escenario: Enum inválido\n'))

      await validateAndShow(AssignRoleDto, {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'INVALID_ROLE',
      })

      console.log(chalk.white('\n  📝 Escenario: Datos válidos\n'))

      await validateAndShow(AssignRoleDto, {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        role: UserRole.AUDITOR,
      })
    },
  },

  'custom-field': {
    name: 'Nombres de Campo Personalizados',
    icon: '✏️',
    description: 'Demuestra uso de fieldName personalizado',
    async run() {
      console.log(
        chalk.white('\n  📝 Escenario: Campo con nombre personalizado\n'),
      )
      console.log(
        chalk.gray(
          '    Nota: "productCode" usa fieldName: "código del producto"',
        ),
      )
      console.log(
        chalk.gray(
          '    Nota: "fullName" usa fieldName: "nombre completo del producto"\n',
        ),
      )

      await validateAndShow(ProductDto, {
        productCode: 'ABC', // Muy corto
        fullName: 'Pro', // Muy corto
      })

      console.log(chalk.white('\n  📝 Escenario: Datos válidos\n'))

      await validateAndShow(ProductDto, {
        productCode: 'PROD-2024-001',
        fullName: 'Producto de Prueba',
      })
    },
  },

  numbers: {
    name: 'Validación Numérica con Rangos',
    icon: '🔢',
    description: 'Demuestra validación de números con Min/Max',
    async run() {
      console.log(chalk.white('\n  📝 Escenario: Puntuación fuera de rango\n'))

      await validateAndShow(ScoreDto, {
        score: '150', // Excede max (100)
        weight: '-5', // Menor que min (1)
      })

      console.log(chalk.white('\n  📝 Escenario: Puntuación negativa\n'))

      await validateAndShow(ScoreDto, {
        score: '-10', // Menor que min (0)
        weight: '1',
      })

      console.log(chalk.white('\n  📝 Escenario: Datos válidos\n'))

      await validateAndShow(ScoreDto, {
        score: '95',
        weight: '10',
      })
    },
  },

  patterns: {
    name: 'Validación con Patrones (Regex)',
    icon: '🔍',
    description: 'Demuestra validación con expresiones regulares',
    async run() {
      console.log(
        chalk.white('\n  📝 Escenario: Username con caracteres inválidos\n'),
      )
      console.log(
        chalk.gray(
          '    Patrón: Solo letras, números y guión bajo (^[a-zA-Z0-9_]+$)\n',
        ),
      )

      await validateAndShow(UserBasicDto, {
        names: 'Juan',
        lastNames: 'Pérez',
        email: 'juan@example.com',
        username: 'juan-perez', // Guión no permitido
      })

      console.log(chalk.white('\n  📝 Escenario: Username válido\n'))

      await validateAndShow(UserBasicDto, {
        names: 'Juan',
        lastNames: 'Pérez',
        email: 'juan@example.com',
        username: 'juan_perez_2024', // Válido: letras, números, guión bajo
      })
    },
  },
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Ejecuta un solo escenario
 */
async function runSingleScenario(name: string) {
  const scenario = TEST_SCENARIOS[name]

  if (!scenario) {
    console.error(chalk.red('\n❌ Escenario inválido:'), name)
    console.log(chalk.yellow('\n💡 Escenarios disponibles:'))
    Object.entries(TEST_SCENARIOS).forEach(([key, s]) => {
      console.log(chalk.white(`  - ${key.padEnd(15)} ${s.icon} ${s.name}`))
    })
    console.log('')
    process.exit(1)
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan(`  ${scenario.icon} ${scenario.name}`))
  console.log(chalk.gray(`  ${scenario.description}`))
  console.log(chalk.cyan('═'.repeat(70)))

  await scenario.run()

  console.log(chalk.cyan('\n' + '═'.repeat(70) + '\n'))
}

/**
 * Ejecuta todos los escenarios
 */
async function runAllScenarios() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(
    chalk.bold.cyan('  🌐 Sistema i18n - Probando Todos los Escenarios'),
  )
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  let successCount = 0
  let errorCount = 0

  for (const [name, scenario] of Object.entries(TEST_SCENARIOS)) {
    console.log(chalk.cyan('━'.repeat(70)))
    console.log(name)
    console.log(chalk.bold.white(`${scenario.icon} ${scenario.name}`))
    console.log(chalk.gray(`${scenario.description}`))
    console.log(chalk.cyan('━'.repeat(70)))

    try {
      await scenario.run()
      successCount++
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(chalk.red(`\n  ✖ Error: ${errorMessage}\n`))
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

  console.log(chalk.yellow('📚 Documentación:'))
  console.log(chalk.white('  - README: src/@core/i18n/README.md'))
  console.log(chalk.white('  - Ejemplos: src/@core/i18n/EXAMPLE.md'))
  console.log(chalk.white('  - Migración: src/@core/i18n/MIGRATION.md'))
  console.log('')

  console.log(chalk.yellow('💡 Tips:'))
  console.log(
    chalk.white(
      '  - Agrega traducciones en: constants/field-names.constants.ts',
    ),
  )
  console.log(
    chalk.white('  - Los transformers se aplican ANTES de la validación'),
  )
  console.log(
    chalk.white('  - Usa { fieldName: "..." } para nombres personalizados'),
  )
  console.log('')
}

/**
 * Muestra ayuda
 */
function showHelp() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  🌐 Sistema i18n - Herramienta de Testing'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  console.log(chalk.yellow('🚀 Comandos:\n'))
  console.log(chalk.white('  Probar todos los escenarios:'))
  console.log(chalk.green('    npm run i18n:test'))
  console.log('')
  console.log(chalk.white('  Probar escenario específico:'))
  Object.keys(TEST_SCENARIOS).forEach((key) => {
    console.log(chalk.green(`    npm run i18n:test ${key}`))
  })
  console.log('')

  console.log(chalk.yellow('📋 Escenarios disponibles:\n'))
  Object.entries(TEST_SCENARIOS).forEach(([key, scenario]) => {
    console.log(
      chalk.white(
        `  ${scenario.icon} ${key.padEnd(15)} - ${scenario.description}`,
      ),
    )
  })
  console.log('')

  console.log(chalk.yellow('✨ Características demostradas:\n'))
  console.log(chalk.white('  🌐 Traducción automática de campos'))
  console.log(chalk.white('     names → nombres, email → correo electrónico'))
  console.log('')
  console.log(chalk.white('  🔄 Transformers automáticos'))
  console.log(
    chalk.white('     "true" → true, "42" → 42, "a,b,c" → ["a","b","c"]'),
  )
  console.log('')
  console.log(chalk.white('  ✏️  Nombres de campo personalizados'))
  console.log(chalk.white('     { fieldName: "código del producto" }'))
  console.log('')
  console.log(chalk.white('  📝 Mensajes en español'))
  console.log(
    chalk.white('     "El campo nombres debe tener al menos 2 caracteres"'),
  )
  console.log('')

  console.log(chalk.cyan('═'.repeat(70) + '\n'))
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const mode = process.argv[2] || 'all'

  try {
    switch (mode) {
      case 'all':
        await runAllScenarios()
        break

      case 'help':
      case '--help':
      case '-h':
        showHelp()
        break

      default:
        // Intentar como escenario
        if (TEST_SCENARIOS[mode]) {
          await runSingleScenario(mode)
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

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
