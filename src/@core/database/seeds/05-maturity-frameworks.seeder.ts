import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { MaturityFrameworkEntity } from '../../../modules/maturity/entities/maturity-framework.entity'
import { MaturityLevelEntity } from '../../../modules/maturity/entities/maturity-level.entity'
import {
  COBIT5Framework,
  CMMIFramework,
  type MaturityFrameworkDefinition,
} from '../factories/maturity'

/**
 * Maturity Frameworks Seeder
 *
 * Carga los frameworks de madurez base del sistema:
 * - COBIT 5 (niveles 0-5)
 * - CMMI (niveles 1-5)
 *
 * Cada framework incluye sus niveles de madurez con:
 * - Descripción, color, icono
 * - Recomendaciones y observaciones
 */
export default class MaturityFrameworksSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Iniciando seeder de frameworks de madurez...')

    // Limpiar datos existentes
    await dataSource.query('DELETE FROM maturity_levels')
    await dataSource.query('DELETE FROM maturity_frameworks')
    console.log('   ✅ Tablas limpiadas')

    // Cargar frameworks
    const frameworks = [COBIT5Framework, CMMIFramework]

    for (const frameworkDef of frameworks) {
      await this.seedFramework(dataSource, frameworkDef)
    }

    console.log(
      `✅ ${frameworks.length} framework(s) de madurez cargado(s) exitosamente con sus niveles`,
    )
  }

  /**
   * Carga un framework y sus niveles en la BD
   */
  private async seedFramework(
    dataSource: DataSource,
    frameworkDef: MaturityFrameworkDefinition,
  ): Promise<void> {
    const frameworkRepo = dataSource.getRepository(MaturityFrameworkEntity)
    const levelRepo = dataSource.getRepository(MaturityLevelEntity)

    // 1. Crear el framework
    const framework = frameworkRepo.create({
      name: frameworkDef.name,
      code: frameworkDef.code,
      description: frameworkDef.description,
      minLevel: frameworkDef.minLevel,
      maxLevel: frameworkDef.maxLevel,
      isActive: frameworkDef.isActive,
    })

    await frameworkRepo.save(framework)
    console.log(`   📊 Framework creado: ${framework.name} (${framework.code})`)

    // 2. Crear niveles de madurez
    for (const levelDef of frameworkDef.levels) {
      const level = levelRepo.create({
        frameworkId: framework.id,
        level: levelDef.level,
        name: levelDef.name,
        shortName: levelDef.shortName,
        description: levelDef.description,
        color: levelDef.color,
        icon: levelDef.icon,
        recommendations: levelDef.recommendations,
        observations: levelDef.observations,
        order: levelDef.order,
        isMinimumAcceptable: levelDef.isMinimumAcceptable || false,
        isTarget: levelDef.isTarget || false,
      })

      await levelRepo.save(level)
    }

    console.log(
      `      └─ ${frameworkDef.levels.length} niveles creados (${framework.minLevel}-${framework.maxLevel})`,
    )
  }
}
