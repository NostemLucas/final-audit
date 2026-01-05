import { BaseRepository } from "@core/repositories";
import { OrganizationEntity } from "../entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClsService } from "nestjs-cls";
import { IOrganizationRepository } from "./origanization-repository.interface";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationRepository extends BaseRepository<OrganizationEntity> implements IOrganizationRepository {
    constructor(
        @InjectRepository(OrganizationEntity)
        repository: Repository<OrganizationEntity>,
        cls: ClsService,
    ) {
        super(repository, cls);
    }

    async findByNit(nit: string): Promise<OrganizationEntity | null> {
        return await this.getRepo().findOne({
            where: { nit }
        });
    }

    async findByName(name: string): Promise<OrganizationEntity | null> {
        return await this.getRepo().findOne({
            where: { name }
        });
    }

    async findAllActive(): Promise<OrganizationEntity[]> {
        return await this.getRepo().find({
            where: { isActive: true },
            relations: ['users'],
            order: { createdAt: 'DESC' },
        });
    }

    async findActiveById(id: string): Promise<OrganizationEntity | null> {
        return await this.getRepo().findOne({
            where: { id, isActive: true },
            relations: ['users'],
        });
    }

    async findActiveByNit(nit: string): Promise<OrganizationEntity | null> {
        return await this.getRepo().findOne({
            where: { nit, isActive: true },
            relations: ['users'],
        });
    }

    async countActiveUsers(organizationId: string): Promise<number> {
        return await this.getRepo()
            .createQueryBuilder('org')
            .leftJoin('org.users', 'user')
            .where('org.id = :id', { id: organizationId })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .getCount();
    }

    async hardDelete(id: string): Promise<void> {
        await this.getRepo().delete(id);
    }
}