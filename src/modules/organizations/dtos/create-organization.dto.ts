import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Nombre de la organización',
    example: 'Acme Corporation',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string

  @ApiProperty({
    description: 'Número de Identificación Tributaria (NIT)',
    example: '900123456-7',
    minLength: 5,
    maxLength: 50,
  })
  @IsString()
  @MinLength(5, { message: 'El NIT debe tener al menos 5 caracteres' })
  @MaxLength(50, { message: 'El NIT no puede exceder 50 caracteres' })
  @Matches(/^[0-9A-Za-z-]+$/, {
    message: 'El NIT solo puede contener números, letras y guiones',
  })
  nit: string

  @ApiPropertyOptional({
    description: 'Descripción de la organización',
    example: 'Empresa líder en tecnología',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  description?: string

  @ApiPropertyOptional({
    description: 'Dirección física de la organización',
    example: 'Calle 123 #45-67, Bogotá',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La dirección no puede exceder 500 caracteres' })
  address?: string

  @ApiPropertyOptional({
    description: 'Teléfono de contacto',
    example: '+57 1 234 5678',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El teléfono no puede exceder 50 caracteres' })
  phone?: string

  @ApiPropertyOptional({
    description: 'Email de contacto',
    example: 'contacto@acme.com',
    maxLength: 200,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @MaxLength(200, { message: 'El email no puede exceder 200 caracteres' })
  email?: string
}
