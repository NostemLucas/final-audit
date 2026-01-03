export class DataSanitizer {
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'sessionId',
  ]

  static sanitize(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return {}
    }

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()

      if (this.SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
        sanitized[key] = '***REDACTED***'
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>)
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) =>
          typeof item === 'object' && item !== null
            ? this.sanitize(item as Record<string, unknown>)
            : item,
        )
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }
}
