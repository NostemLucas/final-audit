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
  Res,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { UploadSpreadsheet } from '@core/files'
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CloneTemplateDto,
} from '../use-cases'
import { ImportTemplateMetadataDto } from '../dtos'
import { CreateTemplateUseCase } from '../use-cases/create-template/create-template.use-case'
import { UpdateTemplateUseCase } from '../use-cases/update-template/update-template.use-case'
import { DeleteTemplateUseCase } from '../use-cases/delete-template/delete-template.use-case'
import { FindTemplateUseCase } from '../use-cases/find-template/find-template.use-case'
import { FindTemplatesUseCase } from '../use-cases/find-templates/find-templates.use-case'
import { PublishTemplateUseCase } from '../use-cases/publish-template/publish-template.use-case'
import { ArchiveTemplateUseCase } from '../use-cases/archive-template/archive-template.use-case'
import { CloneTemplateUseCase } from '../use-cases/clone-template/clone-template.use-case'
import { TemplateImportService } from '../services/template-import.service'

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
    private readonly templateImportService: TemplateImportService,
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

  // ========================================
  // Import/Export Endpoints
  // ========================================

  @Post('import/excel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Importar plantilla desde Excel',
    description:
      'Sube un archivo Excel con 1 hoja "Estándares" + campos de formulario (name, description, version). Valida y crea la plantilla con sus estándares.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Plantilla importada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Errores de validación en el archivo o campos',
  })
  @UploadSpreadsheet({ fieldName: 'file', maxSize: 15 * 1024 * 1024 })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: ImportTemplateMetadataDto,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo')
    }

    // Step 1: Process and validate file
    const importResult = await this.templateImportService.processExcelFile(
      file.buffer,
    )

    // Step 2: If validation successful, save to database
    if (importResult.success) {
      const savedResult = await this.templateImportService.saveImportResult(
        metadata,
        importResult,
      )
      return {
        success: true,
        message: 'Plantilla importada exitosamente',
        data: savedResult,
        summary: importResult.summary,
      }
    }

    // Step 3: Return validation errors
    return {
      success: false,
      message: 'Errores de validación encontrados',
      errors: {
        standards: importResult.standards.errors,
        crossValidation: importResult.crossValidationErrors,
      },
      summary: importResult.summary,
    }
  }

  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Importar plantilla desde CSV',
    description:
      'Sube 1 archivo CSV con estándares + campos de formulario (name, description, version). Valida y crea la plantilla con sus estándares.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Plantilla importada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Errores de validación en el archivo o campos',
  })
  @UploadSpreadsheet({
    fieldName: 'file',
    maxSize: 10 * 1024 * 1024,
  })
  async importCSV(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: ImportTemplateMetadataDto,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo CSV')
    }

    // Extract CSV content as string
    const standardsCsv = file.buffer.toString('utf-8')

    // Step 1: Process and validate file
    const importResult =
      await this.templateImportService.processCSVFile(standardsCsv)

    // Step 2: If validation successful, save to database
    if (importResult.success) {
      const savedResult = await this.templateImportService.saveImportResult(
        metadata,
        importResult,
      )
      return {
        success: true,
        message: 'Plantilla importada exitosamente',
        data: savedResult,
        summary: importResult.summary,
      }
    }

    // Step 3: Return validation errors
    return {
      success: false,
      message: 'Errores de validación encontrados',
      errors: {
        standards: importResult.standards.errors,
        crossValidation: importResult.crossValidationErrors,
      },
      summary: importResult.summary,
    }
  }

  @Get('export/excel-template')
  @ApiOperation({
    summary: 'Descargar plantilla de Excel',
    description:
      'Descarga un archivo Excel vacío con la estructura correcta para importar estándares (1 hoja). Los metadatos de la plantilla se envían como campos de formulario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla Excel generada (solo estándares)',
  })
  downloadExcelTemplate(@Res() res: Response) {
    const buffer = this.templateImportService.generateExcelTemplate()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=estandares-template.xlsx',
    )
    res.send(buffer)
  }

  @Get('export/csv-template')
  @ApiOperation({
    summary: 'Descargar plantilla CSV',
    description:
      'Descarga un archivo CSV vacío con la estructura correcta para importar estándares. Los metadatos de la plantilla se envían como campos de formulario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla CSV generada (solo estándares)',
  })
  downloadCSVTemplate(@Res() res: Response) {
    const standardsCsv = this.templateImportService.generateCSVTemplate()

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=estandares-template.csv',
    )
    res.send(standardsCsv)
  }
}
