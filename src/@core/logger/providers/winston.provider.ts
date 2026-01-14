import { Injectable } from '@nestjs/common'
import * as winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { LogLevel } from '../types'
import { colorFormatter, consoleFormatter, fileFormatter } from '../formatters'

/**
 * WinstonProvider - Singleton que gestiona una única instancia de Winston
 *
 * PROBLEMA RESUELTO:
 * Antes cada BaseLogger creaba su propia instancia de Winston,
 * resultando en múltiples instancias escribiendo en archivos.
 *
 * SOLUCIÓN:
 * Ahora WinstonProvider crea UNA SOLA instancia de Winston compartida
 * por todos los loggers, reduciendo consumo de memoria y file handles.
 */
@Injectable()
export class WinstonProvider {
  private static instance: winston.Logger | null = null

  /**
   * Obtiene la instancia singleton de Winston
   * Si no existe, la crea. Si ya existe, la reutiliza.
   */
  getLogger(): winston.Logger {
    if (!WinstonProvider.instance) {
      WinstonProvider.instance = this.createLogger()
    }
    return WinstonProvider.instance
  }

  /**
   * Crea la instancia de Winston con todos los transports necesarios
   * Esta instancia será compartida por TODOS los loggers de la aplicación
   */
  private createLogger(): winston.Logger {
    // Niveles personalizados
    const customLevels = {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
    }

    return winston.createLogger({
      levels: customLevels.levels,
      level: process.env.LOG_LEVEL || LogLevel.HTTP,
      // NO usamos defaultMeta aquí porque cada logger tiene su propio 'service'
      // El service se pasará en cada llamada a logger.log()
      transports: [
        this.createConsoleTransport(),
        this.createErrorFileTransport(),
        this.createCombinedFileTransport(),
      ],
    })
  }

  /**
   * Transport para consola con formato colorizado
   */
  private createConsoleTransport(): winston.transports.ConsoleTransportInstance {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        colorFormatter,
        consoleFormatter,
      ),
    })
  }

  /**
   * Transport para archivo de errores con rotación diaria
   * Solo guarda logs de nivel ERROR
   */
  private createErrorFileTransport(): DailyRotateFile {
    return new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: LogLevel.ERROR,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        fileFormatter,
      ),
    })
  }

  /**
   * Transport para archivo combinado con rotación diaria
   * Guarda TODOS los niveles de log
   */
  private createCombinedFileTransport(): DailyRotateFile {
    return new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        fileFormatter,
      ),
    })
  }

  /**
   * Método opcional para cerrar todos los transports
   * Útil en tests o cuando la aplicación se cierra
   */
  async close(): Promise<void> {
    if (WinstonProvider.instance) {
      await new Promise<void>((resolve) => {
        WinstonProvider.instance!.on('finish', resolve)
        WinstonProvider.instance!.end()
      })
      WinstonProvider.instance = null
    }
  }
}
