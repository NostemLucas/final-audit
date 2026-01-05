import { BadRequestException, Injectable } from '@nestjs/common'
import { ALLOWED_MIME_TYPES, FILE_EXTENSIONS } from '../enums/file-type.enum'
import { FileUploadOptions } from '../dtos/file-upload-options.dto'
import sharp from 'sharp'

/**
 * Resultado de validación de archivo
 */
export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
  metadata?: {
    width?: number
    height?: number
    format?: string
    size: number
  }
}

/**
 * Servicio para validar archivos antes de guardarlos
 */
@Injectable()
export class FileValidator {
  /**
   * Valida un archivo según las opciones proporcionadas
   * @throws BadRequestException si el archivo no cumple las validaciones
   */
  async validateFile(
    file: Express.Multer.File,
    options: FileUploadOptions,
  ): Promise<FileValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Validar que el archivo exista
    if (!file || !file.buffer) {
      throw new BadRequestException('No se proporcionó ningún archivo')
    }

    // 2. Validar MIME type
    const allowedMimeTypes = [
      ...ALLOWED_MIME_TYPES[options.fileType],
      ...(options.additionalMimeTypes || []),
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(
        `Tipo de archivo no permitido. Tipos permitidos: ${allowedMimeTypes.join(', ')}`,
      )
    }

    // 3. Validar extensión del archivo
    const fileExtension = this.getFileExtension(file.originalname)
    const allowedExtensions = FILE_EXTENSIONS[options.fileType]

    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      errors.push(
        `Extensión de archivo no permitida. Extensiones permitidas: ${allowedExtensions.join(', ')}`,
      )
    }

    // 4. Validar tamaño
    if (file.size > options.maxSize) {
      errors.push(
        `El archivo es demasiado grande. Tamaño máximo: ${this.formatBytes(options.maxSize)}, tamaño actual: ${this.formatBytes(file.size)}`,
      )
    }

    // Si hay errores hasta aquí, no continuar con validaciones de imagen
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        metadata: { size: file.size },
      }
    }

    // 5. Validar dimensiones de imagen (si aplica)
    let metadata: FileValidationResult['metadata'] = { size: file.size }

    if (
      file.mimetype.startsWith('image/') &&
      file.mimetype !== 'image/svg+xml'
    ) {
      try {
        const imageMetadata = await this.validateImageDimensions(file, options)
        metadata = { ...metadata, ...imageMetadata }

        if (imageMetadata.errors) {
          errors.push(...imageMetadata.errors)
        }
        if (imageMetadata.warnings) {
          warnings.push(...imageMetadata.warnings)
        }
      } catch (_error) {
        errors.push('Error al procesar la imagen')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata,
    }
  }

  /**
   * Valida dimensiones de una imagen
   */
  private async validateImageDimensions(
    file: Express.Multer.File,
    options: FileUploadOptions,
  ): Promise<{
    width: number
    height: number
    format: string
    errors?: string[]
    warnings?: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    const image = sharp(file.buffer)
    const metadata = await image.metadata()

    const { width = 0, height = 0, format = 'unknown' } = metadata

    // Validar ancho mínimo
    if (options.minWidth && width < options.minWidth) {
      errors.push(
        `La imagen es demasiado pequeña. Ancho mínimo: ${options.minWidth}px, actual: ${width}px`,
      )
    }

    // Validar alto mínimo
    if (options.minHeight && height < options.minHeight) {
      errors.push(
        `La imagen es demasiado pequeña. Alto mínimo: ${options.minHeight}px, actual: ${height}px`,
      )
    }

    // Validar ancho máximo
    if (options.maxWidth && width > options.maxWidth) {
      warnings.push(
        `La imagen será redimensionada. Ancho máximo: ${options.maxWidth}px, actual: ${width}px`,
      )
    }

    // Validar alto máximo
    if (options.maxHeight && height > options.maxHeight) {
      warnings.push(
        `La imagen será redimensionada. Alto máximo: ${options.maxHeight}px, actual: ${height}px`,
      )
    }

    return {
      width,
      height,
      format,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Redimensiona una imagen si excede las dimensiones máximas
   */
  async resizeImageIfNeeded(
    buffer: Buffer,
    options: FileUploadOptions,
  ): Promise<Buffer> {
    if (!options.maxWidth && !options.maxHeight) {
      return buffer
    }

    const image = sharp(buffer)
    const metadata = await image.metadata()

    const shouldResize =
      (options.maxWidth &&
        metadata.width &&
        metadata.width > options.maxWidth) ||
      (options.maxHeight &&
        metadata.height &&
        metadata.height > options.maxHeight)

    if (!shouldResize) {
      return buffer
    }

    // Redimensionar manteniendo aspect ratio
    const resized = await image
      .resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    return resized
  }

  /**
   * Obtiene la extensión de un archivo
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? `.${parts.pop()}` : ''
  }

  /**
   * Formatea bytes a formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }
}
