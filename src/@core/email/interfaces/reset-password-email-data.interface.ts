export interface ResetPasswordEmailData {
  to: string
  userName: string
  resetLink: string
  expiresInMinutes: number
}
