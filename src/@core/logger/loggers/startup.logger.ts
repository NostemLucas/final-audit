import { Injectable } from '@nestjs/common'
import chalk from 'chalk'
import { BaseLogger } from './base.logger'
import { WinstonProvider } from '../providers'
import { LogLevel } from '../types'

interface AppConfig {
  appName: string
  version: string
  port: number
  nodeEnv: string
  apiPrefix?: string
}

interface DatabaseConfig {
  type: string
  host?: string
  database?: string
}

/**
 * StartupLogger - Logger especializado para banners de inicio/cierre de la aplicación
 *
 * MEJORA:
 * Ahora extiende BaseLogger y usa Winston, por lo que los logs de startup
 * también se guardan en archivos (logs/app-YYYY-MM-DD.log)
 */
@Injectable()
export class StartupLogger extends BaseLogger {
  private readonly logo = `
  █████╗ ██╗   ██╗██████╗ ██╗████████╗     ██████╗ ██████╗ ██████╗ ███████╗
 ██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ███████║██║   ██║██║  ██║██║   ██║       ██║     ██║   ██║██████╔╝█████╗
 ██╔══██║██║   ██║██║  ██║██║   ██║       ██║     ██║   ██║██╔══██╗██╔══╝
 ██║  ██║╚██████╔╝██████╔╝██║   ██║       ╚██████╗╚██████╔╝██║  ██║███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝        ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
  `

  constructor(winstonProvider: WinstonProvider) {
    super(winstonProvider.getLogger(), 'startup')
  }

  printStartupBanner(appConfig: AppConfig, dbConfig?: DatabaseConfig): void {
    // Mostrar banner visual en consola
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log(chalk.cyan(this.logo))
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log()

    // Información de la aplicación
    this.printSection('APPLICATION', [
      { label: 'Name', value: appConfig.appName, color: 'cyan' },
      { label: 'Version', value: appConfig.version, color: 'green' },
      {
        label: 'Environment',
        value: appConfig.nodeEnv,
        color: this.getEnvColor(appConfig.nodeEnv),
      },
      { label: 'Port', value: appConfig.port.toString(), color: 'yellow' },
      ...(appConfig.apiPrefix
        ? [
            {
              label: 'API Prefix',
              value: appConfig.apiPrefix,
              color: 'magenta' as const,
            },
          ]
        : []),
    ])

    // Información de la base de datos
    if (dbConfig) {
      this.printSection('DATABASE', [
        { label: 'Type', value: dbConfig.type, color: 'cyan' },
        ...(dbConfig.host
          ? [{ label: 'Host', value: dbConfig.host, color: 'white' as const }]
          : []),
        ...(dbConfig.database
          ? [
              {
                label: 'Database',
                value: dbConfig.database,
                color: 'white' as const,
              },
            ]
          : []),
      ])
    }

    // Timestamp y estado
    const url = `http://localhost:${appConfig.port}${appConfig.apiPrefix || ''}`
    console.log()
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log()
    console.log(
      chalk.gray('  Started at:'),
      chalk.white(new Date().toLocaleString('es-ES')),
    )
    console.log(
      chalk.green('  ✓ Application is running on:'),
      chalk.cyan.underline(url),
    )
    console.log()
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log()

    // NUEVO: También guardar en archivo para persistencia
    this.info('Application started', {
      additionalData: {
        application: {
          name: appConfig.appName,
          version: appConfig.version,
          environment: appConfig.nodeEnv,
          port: appConfig.port,
          apiPrefix: appConfig.apiPrefix,
          url,
        },
        database: dbConfig
          ? {
              type: dbConfig.type,
              host: dbConfig.host,
              database: dbConfig.database,
            }
          : undefined,
      },
    })
  }

  printShutdown(reason?: string): void {
    // Mostrar en consola
    console.log()
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log()
    console.log(chalk.yellow('  ⚠ Application shutting down...'))
    if (reason) {
      console.log(chalk.gray('  Reason:'), chalk.white(reason))
    }
    console.log(
      chalk.gray('  Time:'),
      chalk.white(new Date().toLocaleString('es-ES')),
    )
    console.log()
    console.log(chalk.bold.white('═'.repeat(85)))
    console.log()

    // NUEVO: También guardar en archivo
    this.warn('Application shutting down', {
      additionalData: {
        reason,
        time: new Date().toLocaleString('es-ES'),
      },
    })
  }

  printError(error: Error, context?: string): void {
    // Mostrar en consola
    console.log()
    console.log(chalk.bold.red('═'.repeat(85)))
    console.log(chalk.bold.red('  ✗ FATAL ERROR'))
    console.log(chalk.bold.red('═'.repeat(85)))
    console.log()
    if (context) {
      console.log(chalk.red('  Context:'), chalk.white(context))
    }
    console.log(chalk.red('  Error:'), chalk.white(error.message))
    if (error.stack) {
      console.log()
      console.log(chalk.gray('  Stack trace:'))
      console.log(chalk.gray(error.stack))
    }
    console.log()
    console.log(chalk.bold.red('═'.repeat(85)))
    console.log()

    // NUEVO: También guardar en archivo
    this.writeLog(LogLevel.ERROR, 'Fatal error during startup', {
      additionalData: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
      },
    })
  }

  printModuleLoaded(moduleName: string, details?: string): void {
    // Mostrar en consola
    console.log(
      chalk.green('  ✓'),
      chalk.white(moduleName),
      details ? chalk.gray(`(${details})`) : '',
    )

    // NUEVO: También guardar en archivo
    this.debug(`Module loaded: ${moduleName}`, {
      additionalData: {
        module: moduleName,
        details,
      },
    })
  }

  private printSection(
    title: string,
    items: Array<{ label: string; value: string; color: keyof typeof chalk }>,
  ): void {
    console.log(chalk.bold.white(`  ${title}`))
    console.log(chalk.gray('  ' + '─'.repeat(title.length)))
    items.forEach((item) => {
      const colorFn = chalk[item.color] as (text: string) => string
      console.log(chalk.gray(`  ${item.label.padEnd(15)}`), colorFn(item.value))
    })
    console.log()
  }

  private getEnvColor(env: string): keyof typeof chalk {
    switch (env.toLowerCase()) {
      case 'production':
        return 'red'
      case 'development':
        return 'yellow'
      case 'test':
        return 'blue'
      default:
        return 'white'
    }
  }
}
