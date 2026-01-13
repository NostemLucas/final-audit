import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Length,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * DTO para importar Standard desde Excel/CSV
 *
 * Representa un control/cláusula dentro de una plantilla
 * Soporta estructura jerárquica mediante parentCode
 */
export class ImportStandardDto {
  @IsString()
  @IsNotEmpty({ message: 'El código es requerido' })
  @Length(1, 50, { message: 'El código debe tener entre 1 y 50 caracteres' })
  code: string

  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @Length(1, 200, { message: 'El título debe tener entre 1 y 200 caracteres' })
  title: string

  @IsString()
  @IsOptional()
  description?: string

  /**
   * Código del standard padre (para jerarquía)
   * Si es null o vacío, se considera nivel raíz
   */
  @IsString()
  @IsOptional()
  parentCode?: string

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order: number

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'El nivel debe ser mayor o igual a 1' })
  level: number

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isAuditable?: boolean = true

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean = true
}
