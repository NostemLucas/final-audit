import * as winston from 'winston'

interface LogInfo {
  timestamp?: string
  level?: string
  message?: string
  [key: string]: unknown
}

export const fileFormatter = winston.format.printf((info) => {
  const logInfo = info as LogInfo
  const { timestamp, level, message, ...metadata } = logInfo

  // Filter out winston's metadata
  const filteredMetadata = Object.keys(metadata).reduce(
    (acc, key) => {
      if (
        !['timestamp', 'level', 'message', 'splat', Symbol.for('level')].some(
          (reserved) => key === reserved || key === String(reserved),
        )
      ) {
        acc[key] = metadata[key]
      }
      return acc
    },
    {} as Record<string, unknown>,
  )

  const logObject = {
    timestamp,
    level: level ? level.toUpperCase() : '',
    message,
    ...filteredMetadata,
  }

  return JSON.stringify(logObject)
})
