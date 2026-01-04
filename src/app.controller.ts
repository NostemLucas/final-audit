import { Controller, Get, HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Endpoints de prueba para logging y exception handling
  @Get('test/success')
  testSuccess() {
    return {
      message: 'Request exitoso',
      timestamp: new Date().toISOString(),
      data: { example: 'Este request se loguea correctamente' }
    };
  }

  @Get('test/error/400')
  testBadRequest() {
    throw new BadRequestException('Este es un error 400 de prueba');
  }

  @Get('test/error/404')
  testNotFound() {
    throw new NotFoundException('Recurso no encontrado');
  }

  @Get('test/error/500')
  testInternalError() {
    throw new Error('Error interno del servidor');
  }

  @Get('test/error/custom')
  testCustomError() {
    throw new HttpException(
      {
        message: 'Error personalizado',
        details: 'Información adicional del error',
        code: 'CUSTOM_ERROR_CODE',
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
