/**
 * Script para crear templates de email personalizados
 *
 * Uso:
 *   npm run email:template:create
 *   npm run email:template:create mi-template
 */

import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'

const templateName = process.argv[2] || 'custom-notification'

const TEMPLATE_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #4CAF50;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      margin: 20px 0;
      background-color: #4CAF50;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
    .button:hover {
      background-color: #45a049;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .highlight {
      background-color: #fff3cd;
      padding: 15px;
      border-left: 4px solid #ffc107;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{appName}}</h1>
    </div>

    <div class="content">
      <h2>Hola {{userName}}!</h2>

      <p>{{message}}</p>

      <div class="highlight">
        <strong>Nota:</strong> Personaliza este contenido según tus necesidades.
      </div>

      {{#if actionUrl}}
      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="button">{{actionText}}</a>
      </div>
      {{/if}}

      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>

    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
      <p>Este es un email automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>
`

function createTemplate() {
  console.log(chalk.cyan('\n' + '═'.repeat(70)))
  console.log(chalk.bold.cyan('  📝 Creando Template de Email'))
  console.log(chalk.cyan('═'.repeat(70) + '\n'))

  const templatesDir = path.join(__dirname, '..', 'templates')
  const templatePath = path.join(templatesDir, `${templateName}.hbs`)

  if (!fs.existsSync(templatesDir)) {
    console.log(chalk.yellow('📁 Creando directorio templates...'))
    fs.mkdirSync(templatesDir, { recursive: true })
  }

  if (fs.existsSync(templatePath)) {
    console.error(chalk.red('✖ El template ya existe:'), chalk.white(templatePath))
    console.log(chalk.yellow('\n💡 Usa otro nombre o elimina el template existente'))
    console.log('')
    process.exit(1)
  }

  fs.writeFileSync(templatePath, TEMPLATE_CONTENT)

  console.log(chalk.green('✓ Template creado exitosamente'))
  console.log(chalk.white('  Ubicación:'), chalk.cyan(templatePath))
  console.log('')

  console.log(chalk.yellow('🎨 Variables disponibles:'))
  console.log(chalk.white('  {{appName}}       - Nombre de la aplicación'))
  console.log(chalk.white('  {{userName}}      - Nombre del usuario'))
  console.log(chalk.white('  {{message}}       - Mensaje principal'))
  console.log(chalk.white('  {{actionUrl}}     - URL del botón'))
  console.log(chalk.white('  {{actionText}}    - Texto del botón'))
  console.log(chalk.white('  {{currentYear}}   - Año actual'))
  console.log('')

  console.log(chalk.yellow('🧪 Para probar:'))
  console.log(chalk.cyan(`  npm run email:test custom ${templateName}`))
  console.log('')

  console.log(chalk.cyan('═'.repeat(70) + '\n'))
}

createTemplate()
