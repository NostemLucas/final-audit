import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1768408770023 implements MigrationInterface {
    name = 'InitialMigration1768408770023'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "deletedAt" TIMESTAMP, "name" character varying(200) NOT NULL, "nit" character varying(50) NOT NULL, "description" text, "address" character varying(500), "phone" character varying(50), "email" character varying(200), "logoUrl" character varying(500), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"), CONSTRAINT "UQ_9577eaa355490cc4f48582b8780" UNIQUE ("nit"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "deletedAt" TIMESTAMP, "names" character varying(50) NOT NULL, "lastNames" character varying(50) NOT NULL, "email" character varying(100) NOT NULL, "username" character varying(30) NOT NULL, "ci" character varying(15) NOT NULL, "password" character varying(255) NOT NULL, "phone" character varying(20), "address" character varying(200), "image" character varying(500), "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "organizationId" uuid NOT NULL, "roles" text NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_eff3cf686729ac337fe991de64f" UNIQUE ("ci"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "standards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "deletedAt" TIMESTAMP, "templateId" uuid NOT NULL, "parentId" uuid, "code" character varying(50) NOT NULL, "title" character varying(200) NOT NULL, "description" text, "order" integer NOT NULL, "level" integer NOT NULL DEFAULT '1', "isAuditable" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_cb084ce5e29cc74efe0befbefa8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9df2d5c058d37a47d59b7a9c3" ON "standards" ("parentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_abd6ea724a5e3329a6bbdbf292" ON "standards" ("templateId", "order") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a126aa57f91e45179783b0d8a1" ON "standards" ("templateId", "code") `);
        await queryRunner.query(`CREATE TYPE "public"."templates_status_enum" AS ENUM('draft', 'published', 'archived')`);
        await queryRunner.query(`CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "description" text, "version" character varying(20) NOT NULL, "status" "public"."templates_status_enum" NOT NULL DEFAULT 'draft', CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8e968e08328483ed431ecab59f" ON "templates" ("name", "version") `);
        await queryRunner.query(`CREATE TABLE "casbin_rule" ("id" SERIAL NOT NULL, "ptype" character varying(100) NOT NULL, "v0" character varying(100), "v1" character varying(100), "v2" character varying(100), "v3" character varying(100), "v4" character varying(100), "v5" character varying(255), "v6" character varying(255), CONSTRAINT "PK_e147354d31e2748a3a5da5e3060" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a482df99767d5a0e432485a2e0" ON "casbin_rule" ("ptype", "v0", "v1", "v2") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standards" ADD CONSTRAINT "FK_805dd318d004cfb5156b1a5ce8d" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standards" ADD CONSTRAINT "FK_a9df2d5c058d37a47d59b7a9c34" FOREIGN KEY ("parentId") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "standards" DROP CONSTRAINT "FK_a9df2d5c058d37a47d59b7a9c34"`);
        await queryRunner.query(`ALTER TABLE "standards" DROP CONSTRAINT "FK_805dd318d004cfb5156b1a5ce8d"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a482df99767d5a0e432485a2e0"`);
        await queryRunner.query(`DROP TABLE "casbin_rule"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e968e08328483ed431ecab59f"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP TYPE "public"."templates_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a126aa57f91e45179783b0d8a1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abd6ea724a5e3329a6bbdbf292"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9df2d5c058d37a47d59b7a9c3"`);
        await queryRunner.query(`DROP TABLE "standards"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
    }

}
