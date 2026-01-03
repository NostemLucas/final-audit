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
  request?: {
    method?: string
    url?: string
    ip?: string
    contentType?: string
    query?: Record<string, unknown>
    params?: Record<string, unknown>
    body?: Record<string, unknown>
  }
  response?: {
    statusCode?: number
    responseTime?: number
  }
  user?: {
    userId?: string
    userEmail?: string
    userName?: string
  }
  device?: {
    os?: string
    browser?: string
    device?: string
  }
  error?: {
    name?: string
    message?: string
    stack?: string
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
  const {
    timestamp,
    level,
    message,
    query,
    database,
    request,
    response,
    user,
    device,
    error,
    additionalData,
    service,
    ...metadata
  } = logInfo

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

  // Si hay información de usuario, mostrarla en la misma línea
  if (user?.userEmail) {
    const userDisplay = chalk.gray(`👤 ${user.userEmail}`)
    output += ` ${userDisplay}`
  }

  // Si hay información de request HTTP
  if (request) {
    const reqTitle = colorFn('\n  ┌─ Request:')
    const reqData: string[] = []

    if (request.method && request.url) {
      reqData.push(`  │ ${chalk.bold('Endpoint')}: ${chalk.cyan(request.method)} ${chalk.cyan(request.url)}`)
    }
    if (request.ip) {
      reqData.push(`  │ ${chalk.bold('IP')}: ${chalk.cyan(request.ip)}`)
    }
    if (request.contentType) {
      reqData.push(`  │ ${chalk.bold('Content-Type')}: ${chalk.cyan(request.contentType)}`)
    }
    if (request.query && Object.keys(request.query).length > 0) {
      reqData.push(`  │ ${chalk.bold('Query')}: ${formatJSON(request.query, 4)}`)
    }
    if (request.params && Object.keys(request.params).length > 0) {
      reqData.push(`  │ ${chalk.bold('Params')}: ${formatJSON(request.params, 4)}`)
    }
    if (request.body && Object.keys(request.body).length > 0) {
      reqData.push(`  │ ${chalk.bold('Body')}: ${formatJSON(request.body, 4)}`)
    }

    if (reqData.length > 0) {
      output += `${reqTitle}\n${reqData.join('\n')}\n${colorFn('  └─')}`
    }
  }

  // Si hay información de response HTTP
  if (response) {
    const resTitle = colorFn('\n  ┌─ Response:')
    const resData: string[] = []

    if (response.statusCode !== undefined) {
      const statusColor =
        response.statusCode >= 500
          ? chalk.red
          : response.statusCode >= 400
            ? chalk.yellow
            : chalk.green
      resData.push(`  │ ${chalk.bold('Status')}: ${statusColor(response.statusCode)}`)
    }
    if (response.responseTime !== undefined) {
      const timeColor = response.responseTime > 1000 ? chalk.red : chalk.green
      resData.push(`  │ ${chalk.bold('Time')}: ${timeColor(response.responseTime + 'ms')}`)
    }

    if (resData.length > 0) {
      output += `${resTitle}\n${resData.join('\n')}\n${colorFn('  └─')}`
    }
  }

  // Si hay información de device
  if (device) {
    const deviceTitle = colorFn('\n  ┌─ Device:')
    const deviceData: string[] = []

    if (device.browser) deviceData.push(`  │ ${chalk.bold('Browser')}: ${chalk.cyan(device.browser)}`)
    if (device.os) deviceData.push(`  │ ${chalk.bold('OS')}: ${chalk.cyan(device.os)}`)
    if (device.device) deviceData.push(`  │ ${chalk.bold('Device')}: ${chalk.cyan(device.device)}`)

    if (deviceData.length > 0) {
      output += `${deviceTitle}\n${deviceData.join('\n')}\n${colorFn('  └─')}`
    }
  }

  // Si hay query SQL, formatearla de manera especial
  if (query) {
    output += formatSQLBlock(query, cleanLevel)
  }

  // Si hay información de error
  if (error) {
    const errorTitle = chalk.red('\n  ┌─ Error Details:')
    const errorData: string[] = []

    if (error.name) errorData.push(`  │ ${chalk.bold('Name')}: ${chalk.red(error.name)}`)
    if (error.message) errorData.push(`  │ ${chalk.bold('Message')}: ${chalk.red(error.message)}`)
    if (error.stack) {
      const stackLines = error.stack.split('\n').map((line) => `  │   ${chalk.gray(line)}`)
      errorData.push(`  │ ${chalk.bold('Stack')}:\n${stackLines.join('\n')}`)
    }

    if (errorData.length > 0) {
      output += `${errorTitle}\n${errorData.join('\n')}\n${chalk.red('  └─')}`
    }
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
    'request',
    'response',
    'user',
    'device',
    'error',
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
