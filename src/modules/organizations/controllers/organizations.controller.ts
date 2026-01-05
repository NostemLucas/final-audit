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
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger'
import { UploadLogo } from '@core/files'
import { OrganizationsService } from '../services/organizations.service'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva organización',
    description: 'Crea una nueva organización con sus datos básicos',
  })
  @ApiResponse({
    status: 201,
    description: 'Organización creada exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una organización con ese nombre o NIT',
  })
  async create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return await this.organizationsService.create(createOrganizationDto)
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las organizaciones',
    description: 'Retorna la lista de todas las organizaciones activas',
  })
  @ApiResponse({ status: 200, description: 'Lista de organizaciones' })
  async findAll() {
    return await this.organizationsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una organización por ID' })
  @ApiResponse({ status: 200, description: 'Organización encontrada' })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.organizationsService.findOne(id)
  }

  @Get('nit/:nit')
  @ApiOperation({ summary: 'Obtener una organización por NIT' })
  @ApiResponse({ status: 200, description: 'Organización encontrada' })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async findByNit(@Param('nit') nit: string) {
    return await this.organizationsService.findByNit(nit)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una organización' })
  @ApiResponse({
    status: 200,
    description: 'Organización actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una organización con ese nombre o NIT',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return await this.organizationsService.update(id, updateOrganizationDto)
  }

  @Post(':id/upload-logo')
  @HttpCode(HttpStatus.OK)
  @UploadLogo({
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Subir logo de la organización (JPG, PNG, WebP, SVG). Tamaño máximo: 5MB',
  })
  @ApiOperation({
    summary: 'Subir logo de la organización',
    description:
      'Sube una imagen como logo de la organización. La imagen se redimensionará automáticamente si excede 1024x1024px.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logo subido exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Formato de archivo no válido o archivo demasiado grande',
  })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debe proporcionar un archivo de logo')
    }

    return await this.organizationsService.uploadLogo(id, file)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desactivar una organización',
    description:
      'Desactiva una organización (soft delete). No se puede desactivar si tiene usuarios activos.',
  })
  @ApiResponse({
    status: 204,
    description: 'Organización desactivada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La organización tiene usuarios activos',
  })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async remove(@Param('id') id: string) {
    await this.organizationsService.remove(id)
  }
}
