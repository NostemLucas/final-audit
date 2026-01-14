import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// Entities
import {
  AuditEntity,
  EvaluationEntity,
  StandardWeightEntity,
} from './entities'

// Repositories
import {
  AuditRepository,
  EvaluationRepository,
  StandardWeightRepository,
} from './repositories'

// Services
import { AuditScoringService } from './services'

// Use Cases
import {
  CreateAuditUseCase,
  UpdateAuditUseCase,
  GetAuditUseCase,
  ListAuditsUseCase,
  CreateEvaluationUseCase,
  UpdateEvaluationUseCase,
  BulkCreateWeightsUseCase,
  RecalculateScoresUseCase,
} from './use-cases'

// External modules
import { TemplatesModule } from '../templates/templates.module'
import { MaturityModule } from '../maturity/maturity.module'
import { OrganizationsModule } from '../organizations/organizations.module'

// Controllers
import {
  AuditsController,
  EvaluationsController,
  StandardWeightsController,
} from './controllers'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEntity,
      EvaluationEntity,
      StandardWeightEntity,
    ]),
    TemplatesModule,
    MaturityModule,
    OrganizationsModule,
  ],
  controllers: [
    AuditsController,
    EvaluationsController,
    StandardWeightsController,
  ],
  providers: [
    // Repositories
    AuditRepository,
    EvaluationRepository,
    StandardWeightRepository,

    // Services
    AuditScoringService,

    // Use Cases
    CreateAuditUseCase,
    UpdateAuditUseCase,
    GetAuditUseCase,
    ListAuditsUseCase,
    CreateEvaluationUseCase,
    UpdateEvaluationUseCase,
    BulkCreateWeightsUseCase,
    RecalculateScoresUseCase,
  ],
  exports: [
    // Export repositories for use in other modules
    AuditRepository,
    EvaluationRepository,
    StandardWeightRepository,

    // Export scoring service for use in other modules
    AuditScoringService,
  ],
})
export class AuditsModule {}
