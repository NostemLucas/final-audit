import { Module } from '@nestjs/common'
import { UsersController } from './controllers/users.controller'
import { UserValidator } from './validators/user.validator'
import { UserFactory } from './factories/user.factory'
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  FindUsersByOrganizationUseCase,
  UploadProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
  ActivateUserUseCase,
} from './use-cases'

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [
    // Use Cases
    CreateUserUseCase,
    UpdateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    FindUsersByOrganizationUseCase,
    UploadProfileImageUseCase,
    DeactivateUserUseCase,
    RemoveUserUseCase,
    ActivateUserUseCase,
    // Infrastructure
    UserValidator,
    UserFactory,
  ],
  exports: [],
})
export class UsersModule {}
