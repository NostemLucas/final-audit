import { Module } from '@nestjs/common'
import { OrganizationsController } from './controllers/organizations.controller'
import { OrganizationsService } from './services/organizations.service'
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
  imports: [],
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
  ],
  exports: [],
})
export class OrganizationsModule {}
