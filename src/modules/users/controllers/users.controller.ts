import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import {
  ApiCreateResponses,
  ApiReadResponses,
  ApiUpdateResponses,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiStandardResponses,
} from '@core/swagger'

import {
  CreateUserUseCase,
  UpdateUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  FindUsersByOrganizationUseCase,
  UploadProfileImageUseCase,
  DeactivateUserUseCase,
  RemoveUserUseCase,
  ActivateUserUseCase,
} from '../use-cases'
import { CreateUserDto, UpdateUserDto } from '../dtos'
import { UserEntity } from '../entities/user.entity'
import { UploadAvatar } from '@core/files'
import { Public } from '../../auth'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUsersByOrganizationUseCase: FindUsersByOrganizationUseCase,
    private readonly uploadProfileImageUseCase: UploadProfileImageUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly removeUserUseCase: RemoveUserUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo usuario',
    description:
      'Crea un nuevo usuario con sus datos básicos. La contraseña se hashea automáticamente con bcrypt.',
  })
  @ApiCreateResponses(
    UserEntity,
    'Ya existe un usuario con ese email, username o CI',
  )
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.createUserUseCase.execute(createUserDto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll() {
    return await this.findAllUsersUseCase.execute()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.findUserByIdUseCase.execute(id)
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Listar usuarios por organización' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios de la organización',
  })
  async findByOrganization(@Param('organizationId') organizationId: string) {
    return await this.findUsersByOrganizationUseCase.execute(organizationId)
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un usuario',
    description:
      'Actualiza los datos de un usuario. NO actualiza la contraseña (usar endpoint de autenticación).',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Email, username o CI ya están en uso',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.updateUserUseCase.execute(id, updateUserDto)
  }

  @Post(':id/upload-image')
  @HttpCode(HttpStatus.OK)
  @UploadAvatar({
    maxSize: 2 * 1024 * 1024, // 2MB
  })
  @ApiOperation({
    summary: 'Subir imagen de perfil del usuario',
    description:
      'Sube o reemplaza la imagen de perfil. Formatos: JPG, PNG, WebP. Tamaño máximo: 2MB. Dimensiones: 512x512px.',
  })
  @ApiResponse({ status: 200, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o muy grande' })
  async uploadProfileImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debe proporcionar un archivo de imagen')
    }
    return await this.uploadProfileImageUseCase.execute(id, file)
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar un usuario',
    description: 'Cambia el estado del usuario a INACTIVE',
  })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id') id: string) {
    return await this.deactivateUserUseCase.execute(id)
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activar un usuario',
    description: 'Cambia el estado del usuario a ACTIVE',
  })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async activate(@Param('id') id: string) {
    return await this.activateUserUseCase.execute(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un usuario (soft delete)',
    description:
      'Marca el usuario como eliminado sin borrar sus datos de la base de datos',
  })
  @ApiResponse({
    status: 204,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    await this.removeUserUseCase.execute(id)
  }
}
