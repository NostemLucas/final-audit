// src/@core/decorators/real-ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { IpExtractor } from '../logger/utils/ip-extractor'

export const RealIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request = ctx.switchToHttp().getRequest()
    return IpExtractor.extract(req)
  },
)
