import { MigrationInterface, QueryRunner } from "typeorm";

export class AddV6ColumnToCasbinRule1768231861784 implements MigrationInterface {
    name = 'AddV6ColumnToCasbinRule1768231861784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "casbin_rule" ADD "v6" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "casbin_rule" DROP COLUMN "v6"`);
    }

}
