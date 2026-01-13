import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import type { JwtPayload } from '../interfaces'

/**
 * Decorator @GetUser()
 *
 * Obtiene el usuario autenticado del request (req.user)
 * Inyectado por JwtStrategy después de validar el token
 *
 * @param data - Campo específico del usuario a extraer (opcional)
 *
 * @example
 * ```typescript
 * // Obtener todo el payload
 * @Get('profile')
 * async getProfile(@GetUser() user: JwtPayload) {
 *   console.log(user.sub, user.email, user.roles)
 * }
 *
 * // Obtener solo el ID
 * @Get('me')
 * async getMe(@GetUser('sub') userId: string) {
 *   return this.usersService.findOne(userId)
 * }
 *
 * // Obtener solo el email
 * @Get('settings')
 * async getSettings(@GetUser('email') email: string) {
 *   return { email }
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const user = request.user

    return data ? user?.[data] : user
  },
)
