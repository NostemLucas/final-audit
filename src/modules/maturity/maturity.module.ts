import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// Entities
import { MaturityFrameworkEntity } from './entities/maturity-framework.entity'
import { MaturityLevelEntity } from './entities/maturity-level.entity'

// Repositories
import {
  MaturityFrameworksRepository,
  MaturityLevelsRepository,
} from './repositories'

// Use Cases - Frameworks
import {
  CreateFrameworkUseCase,
  UpdateFrameworkUseCase,
  FindFrameworkUseCase,
  FindFrameworksUseCase,
  DeleteFrameworkUseCase,
  ActivateFrameworkUseCase,
} from './use-cases/frameworks'

// Use Cases - Levels
import {
  CreateLevelUseCase,
  UpdateLevelUseCase,
  DeleteLevelUseCase,
  FindLevelsByFrameworkUseCase,
  BulkCreateLevelsUseCase,
} from './use-cases/levels'

// Controllers
import {
  MaturityFrameworksController,
  MaturityLevelsController,
} from './controllers'

@Module({
  imports: [
    TypeOrmModule.forFeature([MaturityFrameworkEntity, MaturityLevelEntity]),
  ],
  controllers: [MaturityFrameworksController, MaturityLevelsController],
  providers: [
    // Repositories
    MaturityFrameworksRepository,
    MaturityLevelsRepository,

    // Framework Use Cases
    CreateFrameworkUseCase,
    UpdateFrameworkUseCase,
    FindFrameworkUseCase,
    FindFrameworksUseCase,
    DeleteFrameworkUseCase,
    ActivateFrameworkUseCase,

    // Level Use Cases
    CreateLevelUseCase,
    UpdateLevelUseCase,
    DeleteLevelUseCase,
    FindLevelsByFrameworkUseCase,
    BulkCreateLevelsUseCase,
  ],
  exports: [
    // Repositories (para otros módulos)
    MaturityFrameworksRepository,
    MaturityLevelsRepository,

    // Use Cases (para otros módulos)
    FindFrameworkUseCase,
    FindFrameworksUseCase,
    FindLevelsByFrameworkUseCase,
  ],
})
export class MaturityModule {}
