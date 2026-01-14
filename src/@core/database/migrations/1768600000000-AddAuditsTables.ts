import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditsTables1768600000000 implements MigrationInterface {
  name = 'AddAuditsTables1768600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==========================================
    // Crear ENUM types
    // ==========================================

    await queryRunner.query(`
      CREATE TYPE "audit_type_enum" AS ENUM (
        'inicial',
        'seguimiento',
        'recertificacion',
        'extraordinaria'
      )
    `)

    await queryRunner.query(`
      CREATE TYPE "audit_status_enum" AS ENUM (
        'draft',
        'in_progress',
        'in_review',
        'completed',
        'cancelled'
      )
    `)

    await queryRunner.query(`
      CREATE TYPE "compliance_status_enum" AS ENUM (
        'compliant',
        'partial',
        'non_compliant',
        'not_applicable',
        'pending'
      )
    `)

    // ==========================================
    // Crear tabla AUDITS
    // ==========================================

    await queryRunner.query(`
      CREATE TABLE "audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deletedAt" TIMESTAMP,

        -- Información básica
        "name" character varying(200) NOT NULL,
        "description" text,

        -- Referencias
        "templateId" uuid NOT NULL,
        "maturityFrameworkId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,

        -- Tipo y estado
        "auditType" "audit_type_enum" NOT NULL DEFAULT 'inicial',
        "status" "audit_status_enum" NOT NULL DEFAULT 'draft',

        -- Fechas
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,

        -- Niveles por defecto
        "defaultExpectedLevelId" uuid,
        "defaultTargetLevelId" uuid,

        -- Resultados calculados
        "totalScore" decimal(5,2),
        "complianceRate" decimal(5,2),
        "totalControls" integer NOT NULL DEFAULT 0,
        "evaluatedControls" integer NOT NULL DEFAULT 0,

        -- Documentación
        "observations" text,
        "conclusions" text,
        "recommendations" text,

        CONSTRAINT "PK_audits" PRIMARY KEY ("id")
      )
    `)

    // Índices de audits
    await queryRunner.query(`
      CREATE INDEX "IDX_audits_organization_status"
      ON "audits" ("organizationId", "status")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_audits_template"
      ON "audits" ("templateId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_audits_framework"
      ON "audits" ("maturityFrameworkId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_audits_dates"
      ON "audits" ("startDate", "endDate")
    `)

    // Foreign keys de audits
    await queryRunner.query(`
      ALTER TABLE "audits"
      ADD CONSTRAINT "FK_audits_template"
      FOREIGN KEY ("templateId")
      REFERENCES "templates"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "audits"
      ADD CONSTRAINT "FK_audits_framework"
      FOREIGN KEY ("maturityFrameworkId")
      REFERENCES "maturity_frameworks"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "audits"
      ADD CONSTRAINT "FK_audits_organization"
      FOREIGN KEY ("organizationId")
      REFERENCES "organizations"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "audits"
      ADD CONSTRAINT "FK_audits_default_expected_level"
      FOREIGN KEY ("defaultExpectedLevelId")
      REFERENCES "maturity_levels"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "audits"
      ADD CONSTRAINT "FK_audits_default_target_level"
      FOREIGN KEY ("defaultTargetLevelId")
      REFERENCES "maturity_levels"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    // ==========================================
    // Crear tabla EVALUATIONS
    // ==========================================

    await queryRunner.query(`
      CREATE TABLE "evaluations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deletedAt" TIMESTAMP,

        -- Referencias
        "auditId" uuid NOT NULL,
        "standardId" uuid NOT NULL,

        -- Niveles de madurez
        "expectedLevelId" uuid NOT NULL,
        "obtainedLevelId" uuid,
        "targetLevelId" uuid,

        -- Resultados
        "score" decimal(5,2),
        "gap" integer,
        "complianceStatus" "compliance_status_enum" NOT NULL DEFAULT 'pending',

        -- Documentación
        "evidence" text,
        "observations" text,
        "recommendations" text,
        "actionPlan" text,
        "dueDate" date,

        -- Auditoría
        "evaluatedBy" uuid,
        "evaluatedAt" TIMESTAMP,

        CONSTRAINT "PK_evaluations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_evaluations_audit_standard" UNIQUE ("auditId", "standardId")
      )
    `)

    // Índices de evaluations
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_evaluations_audit_standard"
      ON "evaluations" ("auditId", "standardId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluations_audit_compliance"
      ON "evaluations" ("auditId", "complianceStatus")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluations_evaluator"
      ON "evaluations" ("evaluatedBy")
    `)

    // Foreign keys de evaluations
    await queryRunner.query(`
      ALTER TABLE "evaluations"
      ADD CONSTRAINT "FK_evaluations_audit"
      FOREIGN KEY ("auditId")
      REFERENCES "audits"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "evaluations"
      ADD CONSTRAINT "FK_evaluations_standard"
      FOREIGN KEY ("standardId")
      REFERENCES "standards"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "evaluations"
      ADD CONSTRAINT "FK_evaluations_expected_level"
      FOREIGN KEY ("expectedLevelId")
      REFERENCES "maturity_levels"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "evaluations"
      ADD CONSTRAINT "FK_evaluations_obtained_level"
      FOREIGN KEY ("obtainedLevelId")
      REFERENCES "maturity_levels"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "evaluations"
      ADD CONSTRAINT "FK_evaluations_target_level"
      FOREIGN KEY ("targetLevelId")
      REFERENCES "maturity_levels"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)

    // ==========================================
    // Crear tabla STANDARD_WEIGHTS
    // ==========================================

    await queryRunner.query(`
      CREATE TABLE "standard_weights" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deletedAt" TIMESTAMP,

        -- Referencias
        "auditId" uuid NOT NULL,
        "standardId" uuid NOT NULL,

        -- Ponderación
        "weight" decimal(5,2) NOT NULL DEFAULT 10,
        "calculatedScore" decimal(5,2),
        "manualScore" decimal(5,2),
        "manualScoreJustification" text,

        -- Progreso
        "evaluatedControls" integer NOT NULL DEFAULT 0,
        "totalControls" integer NOT NULL DEFAULT 0,

        CONSTRAINT "PK_standard_weights" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_standard_weights_audit_standard" UNIQUE ("auditId", "standardId")
      )
    `)

    // Índices de standard_weights
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_standard_weights_audit_standard"
      ON "standard_weights" ("auditId", "standardId")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_standard_weights_audit"
      ON "standard_weights" ("auditId")
    `)

    // Foreign keys de standard_weights
    await queryRunner.query(`
      ALTER TABLE "standard_weights"
      ADD CONSTRAINT "FK_standard_weights_audit"
      FOREIGN KEY ("auditId")
      REFERENCES "audits"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "standard_weights"
      ADD CONSTRAINT "FK_standard_weights_standard"
      FOREIGN KEY ("standardId")
      REFERENCES "standards"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(
      `ALTER TABLE "standard_weights" DROP CONSTRAINT "FK_standard_weights_standard"`,
    )
    await queryRunner.query(
      `ALTER TABLE "standard_weights" DROP CONSTRAINT "FK_standard_weights_audit"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_evaluations_target_level"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_evaluations_obtained_level"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_evaluations_expected_level"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_evaluations_standard"`,
    )
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_evaluations_audit"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_audits_default_target_level"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_audits_default_expected_level"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_audits_organization"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_audits_framework"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audits" DROP CONSTRAINT "FK_audits_template"`,
    )

    // Eliminar índices
    await queryRunner.query(
      `DROP INDEX "public"."IDX_standard_weights_audit"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_standard_weights_audit_standard"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_evaluations_evaluator"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_evaluations_audit_compliance"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_evaluations_audit_standard"`,
    )
    await queryRunner.query(`DROP INDEX "public"."IDX_audits_dates"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_audits_framework"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_audits_template"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audits_organization_status"`,
    )

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "standard_weights"`)
    await queryRunner.query(`DROP TABLE "evaluations"`)
    await queryRunner.query(`DROP TABLE "audits"`)

    // Eliminar ENUMs
    await queryRunner.query(`DROP TYPE "compliance_status_enum"`)
    await queryRunner.query(`DROP TYPE "audit_status_enum"`)
    await queryRunner.query(`DROP TYPE "audit_type_enum"`)
  }
}
