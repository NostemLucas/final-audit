import { FileType } from '../enums/file-type.enum'
import {
  createUploadDecorator,
  UploadFileDecoratorOptions,
} from './upload-file.decorator'

/**
 * Decorador para subir imágenes
 *
 * @example
 * // Avatar de usuario (1 imagen)
 * @Post(':id/avatar')
 * @UploadImage({ fieldName: 'avatar', maxSize: 2 * 1024 * 1024 })
 * async uploadAvatar(
 *   @Param('id') id: string,
 *   @UploadedFile() file: Express.Multer.File,
 * ) {
 *   // ...
 * }
 *
 * @example
 * // Múltiples imágenes (galería)
 * @Post(':id/gallery')
 * @UploadImage({ fieldName: 'images', maxFiles: 10, maxSize: 5 * 1024 * 1024 })
 * async uploadGallery(
 *   @Param('id') id: string,
 *   @UploadedFiles() files: Express.Multer.File[],
 * ) {
 *   // ...
 * }
 */
export function UploadImage(options: UploadFileDecoratorOptions = {}) {
  return createUploadDecorator({
    ...options,
    fileType: FileType.IMAGE,
    defaultFieldName: 'image',
    defaultMaxSize: 5 * 1024 * 1024, // 5MB default
  })
}

/**
 * Decorador específico para avatares
 * Preset: 1 imagen, max 2MB, campo 'avatar'
 */
export function UploadAvatar(
  options: Omit<UploadFileDecoratorOptions, 'fieldName' | 'maxFiles'> = {},
) {
  return UploadImage({
    ...options,
    fieldName: 'avatar',
    maxSize: options.maxSize || 2 * 1024 * 1024, // 2MB
    maxFiles: 1,
    description: 'Subir avatar de usuario (JPG, PNG, WebP)',
  })
}

/**
 * Decorador específico para logos
 * Preset: 1 imagen, max 5MB, campo 'logo'
 */
export function UploadLogo(
  options: Omit<UploadFileDecoratorOptions, 'fieldName' | 'maxFiles'> = {},
) {
  return UploadImage({
    ...options,
    fieldName: 'logo',
    maxSize: options.maxSize || 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    description: 'Subir logo (JPG, PNG, WebP, SVG)',
  })
}
