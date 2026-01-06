import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrganizationEntity } from './entities/organization.entity'
import { OrganizationsController } from './controllers/organizations.controller'
import { OrganizationsService } from './services/organizations.service'
import { OrganizationRepository, ORGANIZATION_REPOSITORY } from './repositories'
import { OrganizationValidator } from './validators/organization.validator'
import { OrganizationFactory } from './factories/organization.factory'

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity])],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationValidator,
    OrganizationFactory,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
  ],
  exports: [OrganizationsService, TypeOrmModule],
})
export class OrganizationsModule {}
