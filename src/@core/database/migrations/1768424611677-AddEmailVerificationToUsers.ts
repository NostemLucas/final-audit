import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEmailVerificationToUsers1768424611677
  implements MigrationInterface
{
  name = 'AddEmailVerificationToUsers1768424611677'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna emailVerified con default false
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false
    `)

    // 2. Agregar columna emailVerifiedAt (nullable)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "emailVerifiedAt" TIMESTAMP
    `)

    // 3. Cambiar default de status a INACTIVE
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status" SET DEFAULT 'inactive'
    `)

    // 4. Actualizar usuarios existentes:
    //    - Marcar como verificados (ya que fueron creados antes del sistema)
    //    - Mantener status ACTIVE
    await queryRunner.query(`
      UPDATE "users"
      SET "emailVerified" = true,
          "emailVerifiedAt" = NOW()
      WHERE "emailVerified" = false
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambio de default de status
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status" SET DEFAULT 'active'
    `)

    // Eliminar columnas
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "emailVerifiedAt"
    `)

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "emailVerified"
    `)
  }
}
