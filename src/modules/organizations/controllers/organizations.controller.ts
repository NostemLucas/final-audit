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
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { UploadLogo } from '@core/files'
import { OrganizationsService } from '../services/organizations.service'
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  FindOrganizationsDto,
} from '../dtos'

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
    summary: 'Obtener organizaciones con paginación y filtros',
    description:
      'Retorna organizaciones con soporte para paginación, búsqueda y filtros',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Registros por página (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'all',
    required: false,
    description: 'Devolver todos los registros sin paginación',
    example: false,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Campo para ordenar (ej: createdAt, name)',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Orden ASC o DESC',
    example: 'DESC',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Búsqueda de texto libre (nombre, NIT, descripción, email)',
    example: 'coca cola',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @ApiQuery({
    name: 'hasLogo',
    required: false,
    description: 'Filtrar organizaciones con/sin logo',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta paginada con organizaciones',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Coca Cola Bolivia',
            nit: '1234567890',
            description: 'Empresa de bebidas',
            address: 'Av. Siempre Viva 123',
            phone: '12345678',
            email: 'info@cocacola.bo',
            logoUrl: '/uploads/organizations/logos/org-123.png',
            isActive: true,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPrevPage: false,
        },
      },
    },
  })
  async findAll(@Query() query: FindOrganizationsDto) {
    return await this.organizationsService.findWithFilters(query)
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
    description:
      'Subir logo de la organización (JPG, PNG, WebP, SVG). Tamaño máximo: 5MB',
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
