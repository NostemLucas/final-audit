import { Request } from 'express'

export class IpExtractor {
  static extract(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']

    if (forwarded) {
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim()
      }
      if (Array.isArray(forwarded)) {
        return forwarded[0].trim()
      }
    }

    return req.socket.remoteAddress || 'Unknown'
  }
}
