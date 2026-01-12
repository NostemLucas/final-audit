import { runSeeders } from 'typeorm-extension'
import dataSource from '../config/data-source'
import OrganizationsSeeder from './01-organizations.seeder'
import UsersSeeder from './02-users.seeder'

async function runAllSeeds() {
  try {
    // Inicializar conexión
    await dataSource.initialize()
    console.log('📦 Database connection initialized')
    console.log('')

    // Ejecutar seeders en orden
    // IMPORTANTE: El orden importa - organizaciones antes que usuarios
    await runSeeders(dataSource, {
      seeds: [
        OrganizationsSeeder, // 1. Crear organizaciones primero
        UsersSeeder, // 2. Crear usuarios (requieren organizaciones)
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
