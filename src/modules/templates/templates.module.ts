import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// Entities
import { TemplateEntity } from './entities/template.entity'
import { StandardEntity } from './entities/standard.entity'

// Repositories
import { TemplatesRepository } from './repositories/templates.repository'
import { StandardsRepository } from './repositories/standards.repository'

// Use Cases - Templates
import { CreateTemplateUseCase } from './use-cases/create-template/create-template.use-case'
import { UpdateTemplateUseCase } from './use-cases/update-template/update-template.use-case'
import { DeleteTemplateUseCase } from './use-cases/delete-template/delete-template.use-case'
import { FindTemplateUseCase } from './use-cases/find-template/find-template.use-case'
import { FindTemplatesUseCase } from './use-cases/find-templates/find-templates.use-case'
import { PublishTemplateUseCase } from './use-cases/publish-template/publish-template.use-case'
import { ArchiveTemplateUseCase } from './use-cases/archive-template/archive-template.use-case'
import { CloneTemplateUseCase } from './use-cases/clone-template/clone-template.use-case'

// Use Cases - Standards
import { CreateStandardUseCase } from './use-cases/standards/create-standard/create-standard.use-case'
import { UpdateStandardUseCase } from './use-cases/standards/update-standard/update-standard.use-case'
import { DeleteStandardUseCase } from './use-cases/standards/delete-standard/delete-standard.use-case'
import { FindStandardsByTemplateUseCase } from './use-cases/standards/find-standards-by-template/find-standards-by-template.use-case'
import { FindStandardsTreeUseCase } from './use-cases/standards/find-standards-tree/find-standards-tree.use-case'

// Controllers
import { TemplatesController } from './controllers/templates.controller'
import { StandardsController } from './controllers/standards.controller'

// Services
import { TemplateImportService } from './services/template-import.service'
import { StandardsService } from './services/standards.service'

@Module({
  imports: [TypeOrmModule.forFeature([TemplateEntity, StandardEntity])],
  controllers: [TemplatesController, StandardsController],
  providers: [
    // Repositories
    TemplatesRepository,
    StandardsRepository,

    // Services
    TemplateImportService,
    StandardsService,

    // Template Use Cases
    CreateTemplateUseCase,
    UpdateTemplateUseCase,
    DeleteTemplateUseCase,
    FindTemplateUseCase,
    FindTemplatesUseCase,
    PublishTemplateUseCase,
    ArchiveTemplateUseCase,
    CloneTemplateUseCase,

    // Standard Use Cases
    CreateStandardUseCase,
    UpdateStandardUseCase,
    DeleteStandardUseCase,
    FindStandardsByTemplateUseCase,
    FindStandardsTreeUseCase,
  ],
  exports: [
    // Repositories (por si otros módulos los necesitan)
    TemplatesRepository,
    StandardsRepository,

    // Use Cases (por si otros módulos los necesitan)
    FindTemplateUseCase,
    FindTemplatesUseCase,
    FindStandardsByTemplateUseCase,
    FindStandardsTreeUseCase,
  ],
})
export class TemplatesModule {}
