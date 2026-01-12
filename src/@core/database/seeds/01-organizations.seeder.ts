import { Seeder } from 'typeorm-extension'
import { DataSource } from 'typeorm'
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity'

/**
 * Seeder de Organizaciones
 *
 * Crea organizaciones de ejemplo para testing y desarrollo
 */
export default class OrganizationsSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const organizationRepository = dataSource.getRepository(OrganizationEntity)

    // Verificar si ya existen organizaciones
    const count = await organizationRepository.count()
    if (count > 0) {
      console.log('⏭️  Organizations already exist, skipping seeder')
      return
    }

    console.log('🏢 Seeding organizations...')

    const organizations = [
      {
        name: 'Audit Corp Bolivia',
        nit: '1234567890',
        address: 'Av. Arce #2147, La Paz',
        phone: '+591 2 2121212',
        email: 'contacto@auditcorp.bo',
        website: 'https://auditcorp.bo',
        description: 'Empresa líder en auditoría y consultoría empresarial',
      },
      {
        name: 'Consultoría & Auditoría S.A.',
        nit: '9876543210',
        address: 'Calle Ballivián #450, Santa Cruz',
        phone: '+591 3 3333333',
        email: 'info@consultoria-auditoria.bo',
        website: 'https://consultoria-auditoria.bo',
        description: 'Servicios de auditoría financiera y operacional',
      },
      {
        name: 'Sistemas de Gestión Integral',
        nit: '5555555555',
        address: 'Av. Heroínas #234, Cochabamba',
        phone: '+591 4 4444444',
        email: 'contacto@sgi.bo',
        website: 'https://sgi.bo',
        description: 'Certificaciones ISO y auditorías de sistemas de gestión',
      },
    ]

    for (const orgData of organizations) {
      const organization = organizationRepository.create(orgData)
      await organizationRepository.save(organization)
      console.log(`  ✓ Created organization: ${orgData.name}`)
    }

    console.log('✅ Organizations seeded successfully!')
  }
}
