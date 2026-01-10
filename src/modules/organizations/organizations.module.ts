import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrganizationEntity } from './entities/organization.entity'
import { OrganizationsController } from './controllers/organizations.controller'
import { OrganizationsService } from './services/organizations.service'
import { OrganizationRepository, ORGANIZATION_REPOSITORY } from './repositories'
import { OrganizationValidator } from './validators/organization.validator'
import { OrganizationFactory } from './factories/organization.factory'
import {
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  FindOrganizationByNitUseCase,
  FindOrganizationsWithFiltersUseCase,
  UploadLogoUseCase,
  RemoveOrganizationUseCase,
  DeleteOrganizationUseCase,
} from './use-cases'

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity])],
  controllers: [OrganizationsController],
  providers: [
    // Service (facade)
    OrganizationsService,

    // Use Cases
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    FindAllOrganizationsUseCase,
    FindOrganizationByIdUseCase,
    FindOrganizationByNitUseCase,
    FindOrganizationsWithFiltersUseCase,
    UploadLogoUseCase,
    RemoveOrganizationUseCase,
    DeleteOrganizationUseCase,

    // Infrastructure
    OrganizationValidator,
    OrganizationFactory,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
  ],
  exports: [
    OrganizationsService,
    ORGANIZATION_REPOSITORY, // Exportar para que otros módulos puedan inyectarlo
    TypeOrmModule,
  ],
})
export class OrganizationsModule {}
