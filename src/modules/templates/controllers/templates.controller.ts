import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CloneTemplateDto,
} from '../use-cases'
import { CreateTemplateUseCase } from '../use-cases/create-template/create-template.use-case'
import { UpdateTemplateUseCase } from '../use-cases/update-template/update-template.use-case'
import { DeleteTemplateUseCase } from '../use-cases/delete-template/delete-template.use-case'
import { FindTemplateUseCase } from '../use-cases/find-template/find-template.use-case'
import { FindTemplatesUseCase } from '../use-cases/find-templates/find-templates.use-case'
import { PublishTemplateUseCase } from '../use-cases/publish-template/publish-template.use-case'
import { ArchiveTemplateUseCase } from '../use-cases/archive-template/archive-template.use-case'
import { CloneTemplateUseCase } from '../use-cases/clone-template/clone-template.use-case'

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly createTemplateUseCase: CreateTemplateUseCase,
    private readonly updateTemplateUseCase: UpdateTemplateUseCase,
    private readonly deleteTemplateUseCase: DeleteTemplateUseCase,
    private readonly findTemplateUseCase: FindTemplateUseCase,
    private readonly findTemplatesUseCase: FindTemplatesUseCase,
    private readonly publishTemplateUseCase: PublishTemplateUseCase,
    private readonly archiveTemplateUseCase: ArchiveTemplateUseCase,
    private readonly cloneTemplateUseCase: CloneTemplateUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva plantilla' })
  @ApiResponse({ status: 201, description: 'Plantilla creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return await this.createTemplateUseCase.execute(createTemplateDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtrar por status: draft, published, archived',
  })
  async findAll(@Query('status') status?: string) {
    return await this.findTemplatesUseCase.execute(status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Plantilla encontrada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.findTemplateUseCase.execute(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una plantilla (solo si está en draft)' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Plantilla no editable (debe estar en draft)',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return await this.updateTemplateUseCase.execute(id, updateTemplateDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una plantilla (solo si está en draft)' })
  @ApiResponse({ status: 204, description: 'Plantilla eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Plantilla no editable (debe estar en draft)',
  })
  async remove(@Param('id') id: string) {
    await this.deleteTemplateUseCase.execute(id)
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar una plantilla (draft → published)' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla publicada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async publish(@Param('id') id: string) {
    return await this.publishTemplateUseCase.execute(id)
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archivar una plantilla (published → archived)' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla archivada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async archive(@Param('id') id: string) {
    return await this.archiveTemplateUseCase.execute(id)
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Clonar una plantilla para crear una nueva versión',
  })
  @ApiResponse({ status: 201, description: 'Plantilla clonada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Ya existe una plantilla con esa versión',
  })
  async clone(
    @Param('id') id: string,
    @Body() cloneTemplateDto: CloneTemplateDto,
  ) {
    return await this.cloneTemplateUseCase.execute(id, cloneTemplateDto)
  }
}
