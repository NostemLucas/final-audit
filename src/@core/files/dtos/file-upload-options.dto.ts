import { FileType } from '../enums/file-type.enum'

/**
 * Opciones de configuración para validar archivos
 */
export class FileUploadOptions {
  /**
   * Tipo de archivo permitido
   */
  fileType: FileType

  /**
   * Tamaño máximo en bytes
   * Ejemplo: 5 * 1024 * 1024 = 5MB
   */
  maxSize: number

  /**
   * Para imágenes: ancho mínimo en píxeles (opcional)
   */
  minWidth?: number

  /**
   * Para imágenes: alto mínimo en píxeles (opcional)
   */
  minHeight?: number

  /**
   * Para imágenes: ancho máximo en píxeles (opcional)
   */
  maxWidth?: number

  /**
   * Para imágenes: alto máximo en píxeles (opcional)
   */
  maxHeight?: number

  /**
   * MIME types adicionales permitidos (además de los del tipo)
   */
  additionalMimeTypes?: string[]
}

/**
 * Configuraciones predefinidas comunes
 */
export const FILE_UPLOAD_CONFIGS = {
  /**
   * Avatar de usuario
   * - Imágenes: JPG, PNG, WebP
   * - Max 2MB
   * - Min 100x100px, Max 2000x2000px
   */
  USER_AVATAR: {
    fileType: FileType.IMAGE,
    maxSize: 2 * 1024 * 1024, // 2MB
    minWidth: 100,
    minHeight: 100,
    maxWidth: 2000,
    maxHeight: 2000,
  } as FileUploadOptions,

  /**
   * Logo de organización
   * - Imágenes: JPG, PNG, WebP, SVG
   * - Max 5MB
   * - Min 200x200px, Max 3000x3000px
   */
  ORGANIZATION_LOGO: {
    fileType: FileType.IMAGE,
    maxSize: 5 * 1024 * 1024, // 5MB
    minWidth: 200,
    minHeight: 200,
    maxWidth: 3000,
    maxHeight: 3000,
  } as FileUploadOptions,

  /**
   * Documento general
   * - PDF, DOC, DOCX, TXT
   * - Max 10MB
   */
  DOCUMENT: {
    fileType: FileType.DOCUMENT,
    maxSize: 10 * 1024 * 1024, // 10MB
  } as FileUploadOptions,

  /**
   * PDF
   * - Solo PDF
   * - Max 20MB
   */
  PDF: {
    fileType: FileType.PDF,
    maxSize: 20 * 1024 * 1024, // 20MB
  } as FileUploadOptions,

  /**
   * Hoja de cálculo
   * - XLS, XLSX, CSV
   * - Max 15MB
   */
  SPREADSHEET: {
    fileType: FileType.SPREADSHEET,
    maxSize: 15 * 1024 * 1024, // 15MB
  } as FileUploadOptions,
}
