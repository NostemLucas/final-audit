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
import { TemplatesService } from '../services/templates.service'
import { CreateTemplateDto, UpdateTemplateDto } from '../dtos'

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva plantilla' })
  @ApiResponse({ status: 201, description: 'Plantilla creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return await this.templatesService.create(createTemplateDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filtrar solo plantillas activas',
  })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    if (activeOnly === 'true') {
      return await this.templatesService.findAllActive()
    }
    return await this.templatesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Plantilla encontrada' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.templatesService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una plantilla' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return await this.templatesService.update(id, updateTemplateDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una plantilla' })
  @ApiResponse({ status: 204, description: 'Plantilla eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async remove(@Param('id') id: string) {
    await this.templatesService.remove(id)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una plantilla' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla desactivada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async deactivate(@Param('id') id: string) {
    return await this.templatesService.deactivate(id)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una plantilla' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla activada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async activate(@Param('id') id: string) {
    return await this.templatesService.activate(id)
  }
}
