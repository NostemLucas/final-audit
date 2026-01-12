import { ApiProperty } from '@nestjs/swagger'
import { Role, UserStatus } from '../../users/entities/user.entity'

/**
 * DTO de respuesta del login
 *
 * Contiene el access token y la información básica del usuario
 * El refresh token se envía en una HTTP-only cookie (no en el body)
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Access token JWT (válido por 15 minutos)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string

  @ApiProperty({
    description: 'Información del usuario autenticado',
  })
  user: {
    id: string
    email: string
    username: string
    fullName: string
    roles: Role[]
    organizationId: string
    status: UserStatus
  }
}
