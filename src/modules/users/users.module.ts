import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from './entities/user.entity'
import { UsersController } from './controllers/users.controller'
import { UsersService } from './services/users.service'
import { UsersRepository, USERS_REPOSITORY } from './repositories'
import { UserValidator } from './validators/user.validator'
import { UserFactory } from './factories/user.factory'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
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
