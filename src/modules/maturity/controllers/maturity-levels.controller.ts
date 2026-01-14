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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import {
  CreateMaturityLevelDto,
  UpdateMaturityLevelDto,
  BulkCreateMaturityLevelsDto,
} from '../dtos'
import {
  CreateLevelUseCase,
  UpdateLevelUseCase,
  DeleteLevelUseCase,
  FindLevelsByFrameworkUseCase,
  BulkCreateLevelsUseCase,
} from '../use-cases'

@ApiTags('maturity-levels')
@Controller('maturity')
export class MaturityLevelsController {
  constructor(
    private readonly createLevelUseCase: CreateLevelUseCase,
    private readonly updateLevelUseCase: UpdateLevelUseCase,
    private readonly deleteLevelUseCase: DeleteLevelUseCase,
    private readonly findLevelsByFrameworkUseCase: FindLevelsByFrameworkUseCase,
    private readonly bulkCreateLevelsUseCase: BulkCreateLevelsUseCase,
  ) {}

  @Post('levels')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo nivel de madurez' })
  @ApiResponse({
    status: 201,
    description: 'Nivel creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Nivel ya existe en el framework',
  })
  async create(@Body() dto: CreateMaturityLevelDto) {
    return await this.createLevelUseCase.execute(dto)
  }

  @Post('levels/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear múltiples niveles de madurez (reemplaza existentes)',
  })
  @ApiResponse({
    status: 201,
    description: 'Niveles creados exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async bulkCreate(@Body() dto: BulkCreateMaturityLevelsDto) {
    return await this.bulkCreateLevelsUseCase.execute(dto)
  }

  @Get('frameworks/:frameworkId/levels')
  @ApiOperation({
    summary: 'Obtener todos los niveles de un framework',
  })
  @ApiResponse({ status: 200, description: 'Lista de niveles' })
  @ApiResponse({ status: 404, description: 'Framework no encontrado' })
  async findByFramework(@Param('frameworkId') frameworkId: string) {
    return await this.findLevelsByFrameworkUseCase.execute(frameworkId)
  }

  @Patch('levels/:id')
  @ApiOperation({ summary: 'Actualizar un nivel de madurez' })
  @ApiResponse({
    status: 200,
    description: 'Nivel actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Nivel con ese número ya existe en el framework',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaturityLevelDto,
  ) {
    return await this.updateLevelUseCase.execute(id, dto)
  }

  @Delete('levels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un nivel de madurez' })
  @ApiResponse({
    status: 204,
    description: 'Nivel eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Nivel no encontrado' })
  async remove(@Param('id') id: string) {
    await this.deleteLevelUseCase.execute(id)
  }
}
