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
import { StandardsService } from '../services/standards.service'
import { CreateStandardDto, UpdateStandardDto } from '../dtos'

@ApiTags('standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva norma' })
  @ApiResponse({ status: 201, description: 'Norma creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createStandardDto: CreateStandardDto) {
    return await this.standardsService.create(createStandardDto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las normas' })
  @ApiResponse({ status: 200, description: 'Lista de normas' })
  @ApiQuery({
    name: 'templateId',
    required: false,
    type: String,
    description: 'Filtrar por ID de plantilla',
  })
  @ApiQuery({
    name: 'tree',
    required: false,
    type: Boolean,
    description: 'Retornar estructura jerárquica (árbol)',
  })
  @ApiQuery({
    name: 'auditableOnly',
    required: false,
    type: Boolean,
    description: 'Filtrar solo normas auditables',
  })
  async findAll(
    @Query('templateId') templateId?: string,
    @Query('tree') tree?: string,
    @Query('auditableOnly') auditableOnly?: string,
  ) {
    if (templateId && tree === 'true') {
      return await this.standardsService.findByTemplateTree(templateId)
    }

    if (templateId && auditableOnly === 'true') {
      return await this.standardsService.findAuditableByTemplate(templateId)
    }

    if (templateId) {
      return await this.standardsService.findByTemplate(templateId)
    }

    return await this.standardsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una norma por ID' })
  @ApiResponse({ status: 200, description: 'Norma encontrada' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.standardsService.findOne(id)
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Obtener hijos de una norma' })
  @ApiResponse({ status: 200, description: 'Lista de normas hijas' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async findChildren(@Param('id') id: string) {
    return await this.standardsService.findChildren(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una norma' })
  @ApiResponse({ status: 200, description: 'Norma actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateStandardDto: UpdateStandardDto,
  ) {
    return await this.standardsService.update(id, updateStandardDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una norma' })
  @ApiResponse({ status: 204, description: 'Norma eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar una norma con hijos',
  })
  async remove(@Param('id') id: string) {
    await this.standardsService.remove(id)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una norma' })
  @ApiResponse({ status: 200, description: 'Norma desactivada exitosamente' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async deactivate(@Param('id') id: string) {
    return await this.standardsService.deactivate(id)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una norma' })
  @ApiResponse({ status: 200, description: 'Norma activada exitosamente' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async activate(@Param('id') id: string) {
    return await this.standardsService.activate(id)
  }
}
