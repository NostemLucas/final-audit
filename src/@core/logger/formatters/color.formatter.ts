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

export const colorFormatter = winston.format.colorize({ level: true, message: false })
