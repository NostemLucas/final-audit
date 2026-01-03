import { Injectable } from '@nestjs/common'
import chalk from 'chalk'

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

@Injectable()
export class StartupLogger {
  private readonly logo = `
  █████╗ ██╗   ██╗██████╗ ██╗████████╗██████╗
 ██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝╚════██╗
 ███████║██║   ██║██║  ██║██║   ██║    █████╔╝
 ██╔══██║██║   ██║██║  ██║██║   ██║   ██╔═══╝
 ██║  ██║╚██████╔╝██████╔╝██║   ██║   ███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝
  `

  printStartupBanner(appConfig: AppConfig, dbConfig?: DatabaseConfig): void {
    console.clear()
    console.log(chalk.cyan(this.logo))
    console.log(chalk.bold.white('═'.repeat(60)))
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
    console.log()
    console.log(chalk.bold.white('═'.repeat(60)))
    console.log()
    console.log(
      chalk.gray('  Started at:'),
      chalk.white(new Date().toLocaleString('es-ES')),
    )
    console.log(
      chalk.green('  ✓ Application is running on:'),
      chalk.cyan.underline(
        `http://localhost:${appConfig.port}${appConfig.apiPrefix || ''}`,
      ),
    )
    console.log()
    console.log(chalk.bold.white('═'.repeat(60)))
    console.log()
  }

  printShutdown(reason?: string): void {
    console.log()
    console.log(chalk.bold.white('═'.repeat(60)))
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
    console.log(chalk.bold.white('═'.repeat(60)))
    console.log()
  }

  printError(error: Error, context?: string): void {
    console.log()
    console.log(chalk.bold.red('═'.repeat(60)))
    console.log(chalk.bold.red('  ✗ FATAL ERROR'))
    console.log(chalk.bold.red('═'.repeat(60)))
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
    console.log(chalk.bold.red('═'.repeat(60)))
    console.log()
  }

  printModuleLoaded(moduleName: string, details?: string): void {
    console.log(
      chalk.green('  ✓'),
      chalk.white(moduleName),
      details ? chalk.gray(`(${details})`) : '',
    )
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
