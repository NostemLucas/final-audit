import { Module } from '@nestjs/common'
import { OrganizationsController } from './controllers/organizations.controller'
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
