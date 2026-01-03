import * as winston from 'winston'
import chalk from 'chalk'

interface LogInfo {
  timestamp?: string
  level?: string
  message?: string
  query?: string
  database?: {
    operation?: string
    errorCode?: string
    errorMessage?: string
  }
  additionalData?: Record<string, unknown>
  [key: string]: unknown
}

// Símbolos para cada nivel de log
const LOG_SYMBOLS = {
  error: '✖',
  warn: '⚠',
  info: 'ℹ',
  http: '→',
  verbose: '…',
  debug: '⚙',
  silly: '○',
}

// Colores para cada nivel
const LOG_COLORS = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.green,
  http: chalk.magenta,
  verbose: chalk.cyan,
  debug: chalk.blue,
  silly: chalk.gray,
}

// Función para formatear JSON de manera más compacta y legible
function formatJSON(obj: unknown, indent = 2): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj)
  }

  const json = JSON.stringify(obj, null, indent)
  return json
    .split('\n')
    .map((line, index) => (index === 0 ? line : ' '.repeat(indent) + line))
    .join('\n')
}

// Función para formatear queries SQL de manera visual
function formatSQLBlock(query: string, level: string): string {
  const colorFn = LOG_COLORS[level as keyof typeof LOG_COLORS] || chalk.white
  const lines = query.split('\n')

  // Separador visual
  const separator = colorFn('─'.repeat(80))

  // Formatear línea por línea
  const formattedLines = lines.map((line) => {
    // Resaltar palabras clave SQL
    const highlighted = line
      .replace(
        /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|CASE|WHEN|THEN|ELSE|END)\b/g,
        (match) => chalk.bold.white(match),
      )
      .replace(/--.*$/g, (match) => chalk.gray.italic(match)) // Comentarios en gris
      .replace(/'([^']*)'/g, (match) => chalk.green(match)) // Strings en verde
      .replace(/\b(\d+)\b/g, (match) => chalk.cyan(match)) // Números en cyan

    return `  ${colorFn('│')} ${highlighted}`
  })

  return `\n${separator}\n${formattedLines.join('\n')}\n${separator}`
}

export const consoleFormatter = winston.format.printf((info) => {
  const logInfo = info as LogInfo
  const { timestamp, level, message, query, database, additionalData, service, ...metadata } =
    logInfo

  // Obtener nivel sin colores ANSI
  const cleanLevel = (level ?? '').replace(/\u001b\[\d+m/g, '').toLowerCase()
  const colorFn = LOG_COLORS[cleanLevel as keyof typeof LOG_COLORS] || chalk.white
  const symbol = LOG_SYMBOLS[cleanLevel as keyof typeof LOG_SYMBOLS] || '•'

  // Timestamp en gris
  const ts = chalk.gray(timestamp ?? '')

  // Service/Context en gris claro
  const ctx = service ? chalk.gray(`[${service}]`) : ''

  // Símbolo y nivel coloreados
  const levelDisplay = colorFn(`${symbol} ${cleanLevel.toUpperCase()}`)

  // Mensaje principal coloreado
  const msg = colorFn(message ?? '')

  // Línea principal
  let output = `${ts} ${levelDisplay} ${ctx} ${msg}`

  // Si hay información de base de datos, mostrarla
  if (database?.operation) {
    const operation = colorFn(`[${database.operation}]`)
    output += ` ${operation}`
  }

  // Si hay query SQL, formatearla de manera especial
  if (query) {
    output += formatSQLBlock(query, cleanLevel)
  }

  // Si hay datos adicionales, mostrarlos de manera estructurada
  if (additionalData && Object.keys(additionalData).length > 0) {
    const dataTitle = colorFn('\n  ┌─ Additional Data:')
    const formattedData = Object.entries(additionalData)
      .map(([key, value]) => {
        const keyDisplay = chalk.bold(key)
        const valueDisplay =
          typeof value === 'object' ? formatJSON(value, 4) : chalk.cyan(String(value))
        return `  │ ${keyDisplay}: ${valueDisplay}`
      })
      .join('\n')
    const dataFooter = colorFn('  └─')

    output += `${dataTitle}\n${formattedData}\n${dataFooter}`
  }

  // Filter out winston's metadata y otras propiedades ya usadas
  const reservedKeys = [
    'timestamp',
    'level',
    'message',
    'query',
    'database',
    'additionalData',
    'service',
    'splat',
    Symbol.for('level'),
  ]

  const filteredMetadata = Object.keys(metadata).reduce(
    (acc, key) => {
      if (!reservedKeys.some((reserved) => key === reserved || key === String(reserved))) {
        acc[key] = metadata[key]
      }
      return acc
    },
    {} as Record<string, unknown>,
  )

  // Si hay metadata adicional, mostrarla
  if (Object.keys(filteredMetadata).length > 0) {
    const metaTitle = colorFn('\n  ┌─ Metadata:')
    const formattedMeta = formatJSON(filteredMetadata, 4)
      .split('\n')
      .map((line) => `  │ ${line}`)
      .join('\n')
    const metaFooter = colorFn('  └─')

    output += `${metaTitle}\n${formattedMeta}\n${metaFooter}`
  }

  return output
})
