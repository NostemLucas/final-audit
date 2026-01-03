import { DeviceInfo } from '../types'

export class UserAgentParser {
  static parse(userAgent: string): DeviceInfo {
    const os = this.parseOS(userAgent)
    const browser = this.parseBrowser(userAgent)
    const device = this.parseDevice(userAgent)

    return {
      os,
      browser,
      device,
      userAgent,
    }
  }

  private static parseOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac OS')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (
      userAgent.includes('iOS') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('iPad')
    ) {
      return 'iOS'
    }
    return 'Unknown'
  }

  private static parseBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome'
    }
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari'
    }
    if (userAgent.includes('Edg')) return 'Edge'
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      return 'Opera'
    }
    return 'Unknown'
  }

  private static parseDevice(userAgent: string): string {
    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone')
    ) {
      return 'Mobile'
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet'
    }
    return 'Desktop'
  }
}
