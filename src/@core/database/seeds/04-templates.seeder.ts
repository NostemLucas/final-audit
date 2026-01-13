import { DataSource } from 'typeorm'
import { Seeder } from 'typeorm-extension'
import { TemplateEntity } from '../../../modules/templates/entities/template.entity'
import { StandardEntity } from '../../../modules/templates/entities/standard.entity'
import {
  ISO27001Template,
  ASFITemplate,
  type TemplateDefinition,
  type StandardDefinition,
} from '../factories/templates'

/**
 * Templates Seeder
 *
 * Carga las plantillas base del sistema:
 * - ISO 27001:2013
 * - ASFI (Bolivia)
 *
 * Cada plantilla incluye sus standards/controles jerárquicos
 */
export default class TemplatesSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const templateRepo = dataSource.getRepository(TemplateEntity)
    const standardRepo = dataSource.getRepository(StandardEntity)

    console.log('🌱 Iniciando seeder de plantillas...')

    // Limpiar datos existentes (usando query directo para evitar error de TypeORM)
    await dataSource.query('DELETE FROM standards')
    await dataSource.query('DELETE FROM templates')
    console.log('   ✅ Tablas limpiadas')

    // Cargar plantillas
    const templates = [ISO27001Template, ASFITemplate]

    for (const templateDef of templates) {
      await this.seedTemplate(dataSource, templateDef)
    }

    console.log(
      `✅ ${templates.length} plantillas cargadas exitosamente con sus standards`,
    )
  }

  /**
   * Carga una plantilla y sus standards en la BD
   */
  private async seedTemplate(
    dataSource: DataSource,
    templateDef: TemplateDefinition,
  ): Promise<void> {
    const templateRepo = dataSource.getRepository(TemplateEntity)
    const standardRepo = dataSource.getRepository(StandardEntity)

    // 1. Crear el template
    const template = templateRepo.create({
      name: templateDef.name,
      description: templateDef.description,
      version: templateDef.version,
      status: templateDef.status,
    })

    await templateRepo.save(template)
    console.log(`   📋 Template creado: ${template.name} ${template.version}`)

    // 2. Crear standards (primero los de nivel 1, luego nivel 2, etc.)
    // Esto asegura que los padres existan antes de los hijos

    // Agrupar por nivel
    const maxLevel = Math.max(...templateDef.standards.map((s) => s.level))
    const standardsByCode = new Map<string, string>() // code -> id

    for (let level = 1; level <= maxLevel; level++) {
      const standardsAtLevel = templateDef.standards.filter(
        (s) => s.level === level,
      )

      for (const standardDef of standardsAtLevel) {
        const standard = standardRepo.create({
          templateId: template.id,
          parentId: standardDef.parentCode
            ? standardsByCode.get(standardDef.parentCode) || null
            : null,
          code: standardDef.code,
          title: standardDef.title,
          description: standardDef.description,
          order: standardDef.order,
          level: standardDef.level,
          isAuditable: standardDef.isAuditable,
          isActive: true,
        })

        await standardRepo.save(standard)
        standardsByCode.set(standard.code, standard.id)
      }
    }

    console.log(`      └─ ${templateDef.standards.length} standards creados`)
  }
}
