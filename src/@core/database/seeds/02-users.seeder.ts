import { Seeder } from 'typeorm-extension'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import {
  UserEntity,
  Role,
  UserStatus,
} from '../../../modules/users/entities/user.entity'
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity'

/**
 * Seeder de Usuarios
 *
 * Crea usuarios de prueba con diferentes roles para testing
 * Contraseña por defecto: "Password123!"
 */
export default class UsersSeeder implements Seeder {
  private readonly SALT_ROUNDS = 10
  private readonly DEFAULT_PASSWORD = 'Password123!'

  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(UserEntity)
    const organizationRepository = dataSource.getRepository(OrganizationEntity)

    // Verificar si ya existen usuarios
    const count = await userRepository.count()
    if (count > 0) {
      console.log('⏭️  Users already exist, skipping seeder')
      return
    }

    console.log('👥 Seeding users...')

    // Obtener organizaciones para asignar usuarios
    const organizations = await organizationRepository.find({ take: 3 })

    if (organizations.length === 0) {
      console.error('❌ No organizations found. Run OrganizationsSeeder first!')
      return
    }

    const [org1, org2, org3] = organizations

    // Hash de la contraseña por defecto
    const hashedPassword = bcrypt.hashSync(
      this.DEFAULT_PASSWORD,
      this.SALT_ROUNDS,
    )

    const users = [
      // ========================================
      // ADMIN - Acceso total al sistema
      // ========================================
      {
        names: 'Carlos',
        lastNames: 'Administrador',
        email: 'admin@auditcorp.bo',
        username: 'admin',
        ci: '1234567',
        password: hashedPassword,
        phone: '+591 70000001',
        address: 'La Paz, Bolivia',
        roles: [Role.ADMIN],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },

      // ========================================
      // GERENTE - Gestión de auditorías
      // ========================================
      {
        names: 'María',
        lastNames: 'Gerente López',
        email: 'maria.gerente@auditcorp.bo',
        username: 'mgerente',
        ci: '2345678',
        password: hashedPassword,
        phone: '+591 70000002',
        address: 'La Paz, Bolivia',
        roles: [Role.GERENTE],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },
      {
        names: 'Jorge',
        lastNames: 'Gerente Pérez',
        email: 'jorge.gerente@consultoria.bo',
        username: 'jgerente',
        ci: '3456789',
        password: hashedPassword,
        phone: '+591 70000003',
        address: 'Santa Cruz, Bolivia',
        roles: [Role.GERENTE],
        status: UserStatus.ACTIVE,
        organizationId: org2.id,
      },

      // ========================================
      // AUDITOR - Ejecuta auditorías
      // ========================================
      {
        names: 'Ana',
        lastNames: 'Auditor Fernández',
        email: 'ana.auditor@auditcorp.bo',
        username: 'aauditor',
        ci: '4567890',
        password: hashedPassword,
        phone: '+591 70000004',
        address: 'La Paz, Bolivia',
        roles: [Role.AUDITOR],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },
      {
        names: 'Pedro',
        lastNames: 'Auditor Gómez',
        email: 'pedro.auditor@auditcorp.bo',
        username: 'pauditor',
        ci: '5678901',
        password: hashedPassword,
        phone: '+591 70000005',
        address: 'La Paz, Bolivia',
        roles: [Role.AUDITOR],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },
      {
        names: 'Lucía',
        lastNames: 'Auditor Martínez',
        email: 'lucia.auditor@consultoria.bo',
        username: 'lauditor',
        ci: '6789012',
        password: hashedPassword,
        phone: '+591 70000006',
        address: 'Santa Cruz, Bolivia',
        roles: [Role.AUDITOR],
        status: UserStatus.ACTIVE,
        organizationId: org2.id,
      },

      // ========================================
      // USUARIO - Usuario final
      // ========================================
      {
        names: 'Roberto',
        lastNames: 'Usuario Silva',
        email: 'roberto.user@auditcorp.bo',
        username: 'ruser',
        ci: '7890123',
        password: hashedPassword,
        phone: '+591 70000007',
        address: 'La Paz, Bolivia',
        roles: [Role.CLIENTE],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },
      {
        names: 'Carmen',
        lastNames: 'Usuario Vargas',
        email: 'carmen.user@sgi.bo',
        username: 'cuser',
        ci: '8901234',
        password: hashedPassword,
        phone: '+591 70000008',
        address: 'Cochabamba, Bolivia',
        roles: [Role.CLIENTE],
        status: UserStatus.ACTIVE,
        organizationId: org3.id,
      },

      // ========================================
      // MULTI-ROL - Usuario con múltiples roles
      // ========================================
      {
        names: 'Daniela',
        lastNames: 'Multi-Rol Torres',
        email: 'daniela.multi@auditcorp.bo',
        username: 'dmulti',
        ci: '9012345',
        password: hashedPassword,
        phone: '+591 70000009',
        address: 'La Paz, Bolivia',
        roles: [Role.GERENTE, Role.AUDITOR],
        status: UserStatus.ACTIVE,
        organizationId: org1.id,
      },

      // ========================================
      // USUARIOS INACTIVOS - Para testing
      // ========================================
      {
        names: 'Usuario',
        lastNames: 'Inactivo Test',
        email: 'inactivo@auditcorp.bo',
        username: 'inactivo',
        ci: '0123456',
        password: hashedPassword,
        phone: '+591 70000010',
        address: 'La Paz, Bolivia',
        roles: [Role.CLIENTE],
        status: UserStatus.INACTIVE,
        organizationId: org1.id,
      },
      {
        names: 'Usuario',
        lastNames: 'Suspendido Test',
        email: 'suspendido@auditcorp.bo',
        username: 'suspendido',
        ci: '1111111',
        password: hashedPassword,
        phone: '+591 70000011',
        address: 'La Paz, Bolivia',
        roles: [Role.CLIENTE],
        status: UserStatus.SUSPENDED,
        organizationId: org1.id,
      },
    ]

    for (const userData of users) {
      const user = userRepository.create(userData)
      await userRepository.save(user)
      console.log(
        `  ✓ Created user: ${userData.email} (${userData.roles.join(', ')}) - Status: ${userData.status}`,
      )
    }

    console.log('✅ Users seeded successfully!')
    console.log('')
    console.log('📝 Login credentials (all users):')
    console.log(`   Email/Username: Use any email or username above`)
    console.log(`   Password: ${this.DEFAULT_PASSWORD}`)
    console.log('')
    console.log('🔐 Example logins:')
    console.log(`   Admin:    admin@auditcorp.bo / ${this.DEFAULT_PASSWORD}`)
    console.log(
      `   Gerente:  maria.gerente@auditcorp.bo / ${this.DEFAULT_PASSWORD}`,
    )
    console.log(
      `   Auditor:  ana.auditor@auditcorp.bo / ${this.DEFAULT_PASSWORD}`,
    )
    console.log(
      `   Usuario:  roberto.user@auditcorp.bo / ${this.DEFAULT_PASSWORD}`,
    )
  }
}
