import { Module } from '@nestjs/common'
import { UsersController } from './controllers/users.controller'
import { UserValidator } from './validators/user.validator'
import { UserFactory } from './factories/user.factory'
import { EmailVerificationService } from './services'
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UploadProfileImageUseCase,
  DeleteProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
  ActivateUserUseCase,
  VerifyEmailUseCase,
  ResendInvitationUseCase,
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
    UploadProfileImageUseCase,
    DeleteProfileImageUseCase,
    DeactivateUserUseCase,
    RemoveUserUseCase,
    ActivateUserUseCase,
    VerifyEmailUseCase,
    ResendInvitationUseCase,
    // Services
    EmailVerificationService,
    // Infrastructure
    UserValidator,
    UserFactory,
  ],
  exports: [],
})
export class UsersModule {}
