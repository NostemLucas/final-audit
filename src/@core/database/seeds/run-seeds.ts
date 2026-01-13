import { runSeeders } from 'typeorm-extension'
import dataSource from '../config/data-source'
import OrganizationsSeeder from './01-organizations.seeder'
import UsersSeeder from './02-users.seeder'
import PermissionsSeeder from './03-permissions.seeder'
import TemplatesSeeder from './04-templates.seeder'

async function runAllSeeds() {
  try {
    // Inicializar conexión
    await dataSource.initialize()
    console.log('📦 Database connection initialized')
    console.log('')

    // Ejecutar seeders en orden
    // IMPORTANTE: El orden importa
    // 1. Organizaciones primero
    // 2. Usuarios (requieren organizaciones)
    // 3. Permisos (sistema de autorización)
    // 4. Templates (plantillas de auditoría)
    await runSeeders(dataSource, {
      seeds: [
        OrganizationsSeeder, // 1. Crear organizaciones primero
        UsersSeeder, // 2. Crear usuarios (requieren organizaciones)
        PermissionsSeeder, // 3. Cargar permisos de Casbin
        TemplatesSeeder, // 4. Cargar plantillas (ISO 27001, ASFI, etc.)
      ],
    })

    console.log('')
    console.log('🎉 All seeders executed successfully!')
    console.log('')

    // Cerrar conexión
    await dataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error running seeders:', error)
    await dataSource.destroy()
    process.exit(1)
  }
}

void runAllSeeds()
