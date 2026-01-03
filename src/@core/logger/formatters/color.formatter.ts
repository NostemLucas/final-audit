import * as winston from 'winston'
import { LogLevel } from '../types'

const colors = {
  [LogLevel.ERROR]: 'red',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.INFO]: 'green',
  [LogLevel.HTTP]: 'magenta',
  [LogLevel.VERBOSE]: 'cyan',
  [LogLevel.DEBUG]: 'blue',
  [LogLevel.SILLY]: 'grey',
}

winston.addColors(colors)

// Usar colorize solo para el nivel, no para todo el mensaje
// El formatter de consola usa chalk directamente para mejor control
export const colorFormatter = winston.format.colorize({ level: true, message: false })
