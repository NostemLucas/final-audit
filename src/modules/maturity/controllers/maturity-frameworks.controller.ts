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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import {
  CreateMaturityFrameworkDto,
  UpdateMaturityFrameworkDto,
  QueryMaturityFrameworkDto,
} from '../dtos'
import {
  CreateFrameworkUseCase,
  UpdateFrameworkUseCase,
  FindFrameworkUseCase,
  FindFrameworksUseCase,
  DeleteFrameworkUseCase,
  ActivateFrameworkUseCase,
} from '../use-cases'

@ApiTags('maturity-frameworks')
@Controller('maturity/frameworks')
export class MaturityFrameworksController {
  constructor(
    private readonly createFrameworkUseCase: CreateFrameworkUseCase,
    private readonly updateFrameworkUseCase: UpdateFrameworkUseCase,
    private readonly findFrameworkUseCase: FindFrameworkUseCase,
    private readonly findFrameworksUseCase: FindFrameworksUseCase,
    private readonly deleteFrameworkUseCase: DeleteFrameworkUseCase,
    private readonly activateFrameworkUseCase: ActivateFrameworkUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo framework de madurez' })
  @ApiResponse({
    status: 201,
    description: 'Framework creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Framework con ese código ya existe' })
  async create(@Body() dto: CreateMaturityFrameworkDto) {
    return await this.createFrameworkUseCase.execute(dto)
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los frameworks de madurez' })
  @ApiResponse({ status: 200, description: 'Lista de frameworks' })
  async findAll(@Query() query: QueryMaturityFrameworkDto) {
    return await this.findFrameworksUseCase.execute(query)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un framework por ID con sus niveles',
  })
  @ApiResponse({ status: 200, description: 'Framework encontrado' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.findFrameworkUseCase.execute(id, true)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un framework de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Framework actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Framework con ese código ya existe',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaturityFrameworkDto,
  ) {
    return await this.updateFrameworkUseCase.execute(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un framework de madurez' })
  @ApiResponse({
    status: 204,
    description: 'Framework eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async remove(@Param('id') id: string) {
    await this.deleteFrameworkUseCase.execute(id)
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un framework de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Framework activado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async activate(@Param('id') id: string) {
    return await this.activateFrameworkUseCase.execute(id, true)
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un framework de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Framework desactivado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async deactivate(@Param('id') id: string) {
    return await this.activateFrameworkUseCase.execute(id, false)
  }
}
