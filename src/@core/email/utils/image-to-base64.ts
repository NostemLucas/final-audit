import * as fs from 'fs'
import * as path from 'path'

/**
 * Helper para convertir imágenes a Base64 para emails
 *
 * Uso:
 * ```typescript
 * const logo = ImageHelper.imageToBase64('./assets/logo.png')
 * // Resultado: "data:image/png;base64,iVBORw0KGgoAAAANSUh..."
 * ```
 */
export class ImageHelper {
  /**
   * Convierte una imagen a Base64 data URI para embeber en emails
   *
   * @param imagePath - Ruta relativa o absoluta al archivo de imagen
   * @returns String Base64 con data URI completo (data:image/png;base64,...)
   * @throws Error si el archivo no existe o no se puede leer
   *
   * @example
   * const logo = ImageHelper.imageToBase64('./assets/images/logo.png')
   * // <img src="{{logo}}" alt="Logo">
   */
  static imageToBase64(imagePath: string): string {
    try {
      const absolutePath = path.resolve(imagePath)

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Image file not found: ${absolutePath}`)
      }

      const imageBuffer = fs.readFileSync(absolutePath)
      const base64Image = imageBuffer.toString('base64')
      const extension = path.extname(imagePath).slice(1).toLowerCase()

      // Mapeo de extensiones a MIME types
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
      }

      const mimeType = mimeTypes[extension] || 'image/png'

      return `data:${mimeType};base64,${base64Image}`
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to convert image to base64: ${errorMessage}`)
    }
  }

  /**
   * Verifica si un archivo de imagen existe
   *
   * @param imagePath - Ruta al archivo de imagen
   * @returns true si el archivo existe
   */
  static imageExists(imagePath: string): boolean {
    try {
      const absolutePath = path.resolve(imagePath)
      return fs.existsSync(absolutePath)
    } catch {
      return false
    }
  }

  /**
   * Obtiene el tamaño de una imagen en bytes
   *
   * @param imagePath - Ruta al archivo de imagen
   * @returns Tamaño en bytes
   */
  static getImageSize(imagePath: string): number {
    try {
      const absolutePath = path.resolve(imagePath)
      const stats = fs.statSync(absolutePath)
      return stats.size
    } catch {
      return 0
    }
  }

  /**
   * Obtiene el tamaño de una imagen en formato legible (KB, MB)
   *
   * @param imagePath - Ruta al archivo de imagen
   * @returns Tamaño formateado (ej: "45.2 KB")
   */
  static getImageSizeFormatted(imagePath: string): string {
    const bytes = this.getImageSize(imagePath)

    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }
}
