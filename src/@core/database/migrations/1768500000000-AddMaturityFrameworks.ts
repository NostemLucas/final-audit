import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMaturityFrameworks1768500000000 implements MigrationInterface {
  name = 'AddMaturityFrameworks1768500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla maturity_frameworks
    await queryRunner.query(`
      CREATE TABLE "maturity_frameworks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deletedAt" TIMESTAMP,
        "name" character varying(100) NOT NULL,
        "code" character varying(50) NOT NULL,
        "description" text,
        "minLevel" integer NOT NULL DEFAULT 0,
        "maxLevel" integer NOT NULL DEFAULT 5,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_maturity_frameworks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_maturity_frameworks_code" UNIQUE ("code")
      )
    `)

    // Crear índice en code
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_maturity_frameworks_code"
      ON "maturity_frameworks" ("code")
    `)

    // Crear tabla maturity_levels
    await queryRunner.query(`
      CREATE TABLE "maturity_levels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deletedAt" TIMESTAMP,
        "frameworkId" uuid NOT NULL,
        "level" integer NOT NULL,
        "name" character varying(100) NOT NULL,
        "shortName" character varying(20),
        "description" text NOT NULL,
        "color" character varying(7) NOT NULL,
        "icon" character varying(10),
        "recommendations" text,
        "observations" text,
        "order" integer NOT NULL,
        "isMinimumAcceptable" boolean NOT NULL DEFAULT false,
        "isTarget" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_maturity_levels" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_maturity_levels_framework_level" UNIQUE ("frameworkId", "level")
      )
    `)

    // Crear índice único en frameworkId + level
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_maturity_levels_framework_level"
      ON "maturity_levels" ("frameworkId", "level")
    `)

    // Crear índice en frameworkId para búsquedas
    await queryRunner.query(`
      CREATE INDEX "IDX_maturity_levels_framework"
      ON "maturity_levels" ("frameworkId")
    `)

    // Agregar foreign key de maturity_levels -> maturity_frameworks
    await queryRunner.query(`
      ALTER TABLE "maturity_levels"
      ADD CONSTRAINT "FK_maturity_levels_framework"
      FOREIGN KEY ("frameworkId")
      REFERENCES "maturity_frameworks"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign key
    await queryRunner.query(`
      ALTER TABLE "maturity_levels"
      DROP CONSTRAINT "FK_maturity_levels_framework"
    `)

    // Eliminar índices de maturity_levels
    await queryRunner.query(`
      DROP INDEX "public"."IDX_maturity_levels_framework"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."IDX_maturity_levels_framework_level"
    `)

    // Eliminar tabla maturity_levels
    await queryRunner.query(`DROP TABLE "maturity_levels"`)

    // Eliminar índice de maturity_frameworks
    await queryRunner.query(`
      DROP INDEX "public"."IDX_maturity_frameworks_code"
    `)

    // Eliminar tabla maturity_frameworks
    await queryRunner.query(`DROP TABLE "maturity_frameworks"`)
  }
}
