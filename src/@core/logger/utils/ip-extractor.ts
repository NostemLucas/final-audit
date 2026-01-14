import { Request } from 'express'

export class IpExtractor {
  static extract(req: Request): string {
    // 1. Revisar X-Forwarded-For (Proxies estándar)
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) {
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim()
      }
      if (Array.isArray(forwarded)) {
        return forwarded[0].trim()
      }
    }

    // 2. Revisar X-Real-IP (Nginx/Proxies alternativos)
    const realIp = req.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') {
      return realIp.trim()
    }

    // 3. Fallback a conexión directa
    return req.socket.remoteAddress || req.ip || 'Unknown'
  }
}
