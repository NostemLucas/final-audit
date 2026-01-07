import { runSeeders } from 'typeorm-extension'
import dataSource from '../config/data-source'

async function runAllSeeds() {
  try {
    // Inicializar conexión
    await dataSource.initialize()
    console.log('📦 Database connection initialized')

    // Ejecutar seeders en orden
    // Nota: RoleSeeder removido - roles ahora son enums (no tabla en DB)
    await runSeeders(dataSource, {
      seeds: [],
    })

    console.log('🎉 All seeders executed successfully!')

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
