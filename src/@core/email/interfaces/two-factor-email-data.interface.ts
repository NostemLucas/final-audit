export interface TwoFactorEmailData {
  to: string
  userName: string
  code: string
  expiresInMinutes: number
}
