import { ApiProperty } from '@nestjs/swagger'

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string

  @ApiProperty({ example: 'Juan Pérez' })
  fullName: string

  @ApiProperty({ example: 'juan.perez@example.com' })
  email: string

  @ApiProperty({ example: 'jperez' })
  username: string

  @ApiProperty({ example: 'ACTIVE' })
  status: string

  @ApiProperty({ example: '2024-01-20' })
  createdAt: string

  @ApiProperty({ example: ['ADMIN', 'AUDITOR'], isArray: true })
  roles: string[]
  @ApiProperty({ example: 'Empresa S.A.' })
  organizationName: string

  @ApiProperty({ required: false, nullable: true })
  imageUrl: string | null
}
