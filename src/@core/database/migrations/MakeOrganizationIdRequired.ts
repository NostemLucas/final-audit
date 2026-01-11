import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migración: Hacer organizationId requerido en users
 *
 * Cambios:
 * - organizationId ahora es requerido (NOT NULL)
 * - Asigna una organización por defecto a usuarios sin organización (si existen)
 */
export class MakeOrganizationIdRequired1704844800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Primero, obtener la primera organización como fallback
    // (En caso de que haya usuarios sin organizationId)
    const [firstOrg] = await queryRunner.query(`
      SELECT id FROM organizations
      WHERE "deletedAt" IS NULL
      LIMIT 1
    `)

    if (!firstOrg) {
      throw new Error(
        'No se puede hacer organizationId requerido: No hay organizaciones en la base de datos. ' +
          'Crea al menos una organización antes de ejecutar esta migración.',
      )
    }

    // 2. Asignar la primera organización a usuarios que tengan NULL
    await queryRunner.query(
      `
      UPDATE users
      SET "organizationId" = $1
      WHERE "organizationId" IS NULL
    `,
      [firstOrg.id],
    )

    // 3. Ahora hacer la columna NOT NULL
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN "organizationId" SET NOT NULL
    `)

    console.log('✅ organizationId ahora es requerido en users')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir: Hacer la columna nullable nuevamente
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN "organizationId" DROP NOT NULL
    `)

    console.log('✅ organizationId ahora es opcional en users')
  }
}
