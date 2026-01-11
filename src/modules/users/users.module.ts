import { Module } from '@nestjs/common'
import { UsersController } from './controllers/users.controller'
import { UsersService } from './services/users.service'
import { UserValidator } from './validators/user.validator'
import { UserFactory } from './factories/user.factory'
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

/**
 * Módulo de Usuarios (Simplificado con PersistenceModule)
 *
 * ✅ Ya NO necesita:
 * - Importar TypeOrmModule.forFeature([UserEntity])
 * - Importar OrganizationsModule
 * - Proveer USERS_REPOSITORY
 * - Exportar USERS_REPOSITORY
 *
 * 🎯 Responsabilidades:
 * - Controladores
 * - Servicios
 * - Use Cases
 * - Validadores
 * - Factories
 *
 * 📦 Los repositorios vienen de PersistenceModule (global)
 */
@Module({
  imports: [],
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
  ],
  exports: [],
})
export class UsersModule {}
