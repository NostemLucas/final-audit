import { IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * DTO para query parameters al listar frameworks
 */
export class QueryMaturityFrameworkDto {
  @ApiProperty({
    description: 'Filtrar solo frameworks activos',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean
}
