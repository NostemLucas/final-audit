import { registerAs } from '@nestjs/config'

export default registerAs('google', () => ({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || null,
}))
