import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TemplateEntity } from './entities/template.entity'
import { StandardEntity } from './entities/standard.entity'
import { TemplatesService } from './services/templates.service'
import { StandardsService } from './services/standards.service'
import { TemplatesController } from './controllers/templates.controller'
import { StandardsController } from './controllers/standards.controller'

@Module({
  imports: [TypeOrmModule.forFeature([TemplateEntity, StandardEntity])],
  controllers: [TemplatesController, StandardsController],
  providers: [TemplatesService, StandardsService],
  exports: [TemplatesService, StandardsService],
})
export class TemplatesModule {}
