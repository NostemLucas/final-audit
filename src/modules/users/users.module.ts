import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { UsersController } from './controllers/users.controller'
import { UsersService } from './services/users.service'
import { UsersRepository, USERS_REPOSITORY } from './repositories'
import { UserValidator } from './validators/user.validator'
import { UserFactory } from './factories/user.factory'
import { OrganizationsModule } from '../organizations/organizations.module'
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  FindUserByEmailUseCase,
  FindUserByUsernameUseCase,
  FindUserByCIUseCase,
  FindUsersByOrganizationUseCase,
  UploadProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
} from './use-cases'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), OrganizationsModule],
  controllers: [UsersController],
  providers: [
    // Service (facade)
    UsersService,

    // Use Cases
    CreateUserUseCase,
    UpdateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    FindUserByEmailUseCase,
    FindUserByUsernameUseCase,
    FindUserByCIUseCase,
    FindUsersByOrganizationUseCase,
    UploadProfileImageUseCase,
    DeactivateUserUseCase,
    RemoveUserUseCase,

    // Infrastructure
    UserValidator,
    UserFactory,
    {
      provide: USERS_REPOSITORY,
      useClass: UsersRepository,
    },
  ],
  exports: [
    UsersService,
    TypeOrmModule, // Para que otros módulos puedan acceder a UserEntity
  ],
})
export class UsersModule {}
