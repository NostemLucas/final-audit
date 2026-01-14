export class UserResponseDto {
  id: string
  fullName: string
  email: string
  username: string
  isActive: boolean
  createdAt: string
  roles: string[]
  organizationName: string
  imageUrl: string | null
}
