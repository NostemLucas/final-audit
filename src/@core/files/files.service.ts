import { Injectable, Inject } from '@nestjs/common'
import type { IStorageService } from './interfaces/storage.interface'
import { SaveFileResult } from './interfaces/storage.interface'
import { FileValidator } from './validators/file.validator'
import { FileUploadOptions } from './dtos/file-upload-options.dto'

/**
 * Opciones para subir un archivo
 */
export interface UploadFileOptions {
  /**
   * Archivo de Multer
   */
  file: Express.Multer.File

  /**
   * Carpeta destino
   */
  folder: string

  /**
   * Opciones de validación
   */
  validationOptions: FileUploadOptions

  /**
   * Nombre personalizado (opcional)
   */
  customFileName?: string

  /**
   * Sobrescribir si existe (opcional)
   */
  overwrite?: boolean
}

/**
 * Servicio principal de archivos
 * Orquesta la validación y almacenamiento de archivos
 */
@Injectable()
export class FilesService {
  constructor(
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
    private readonly fileValidator: FileValidator,
  ) {}

  /**
   * Sube un archivo con validación
   * @throws BadRequestException si el archivo no pasa las validaciones
   */
  async uploadFile(options: UploadFileOptions): Promise<SaveFileResult> {
    // 1. Validar archivo
    const validation = await this.fileValidator.validateFile(
      options.file,
      options.validationOptions,
    )

    if (!validation.isValid) {
      throw new Error(`Archivo inválido: ${validation.errors.join(', ')}`)
    }

    // 2. Redimensionar imagen si es necesario
    let buffer = options.file.buffer

    if (options.file.mimetype.startsWith('image/')) {
      buffer = await this.fileValidator.resizeImageIfNeeded(
        buffer,
        options.validationOptions,
      )
    }

    // 3. Guardar archivo
    const result = await this.storageService.saveFile({
      buffer,
      originalName: options.file.originalname,
      mimeType: options.file.mimetype,
      folder: options.folder,
      customFileName: options.customFileName,
      overwrite: options.overwrite,
    })

    return result
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(filePath: string): Promise<void> {
    await this.storageService.deleteFile({ filePath })
  }

  /**
   * Verifica si un archivo existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    return await this.storageService.fileExists(filePath)
  }

  /**
   * Obtiene la URL de un archivo
   */
  getFileUrl(filePath: string): string {
    return this.storageService.getFileUrl(filePath)
  }

  /**
   * Elimina un archivo antiguo antes de subir uno nuevo
   * Útil para reemplazar avatars, logos, etc.
   */
  async replaceFile(
    oldFilePath: string | null,
    uploadOptions: UploadFileOptions,
  ): Promise<SaveFileResult> {
    // 1. Subir nuevo archivo
    const result = await this.uploadFile(uploadOptions)

    // 2. Eliminar archivo antiguo (si existe)
    if (oldFilePath) {
      try {
        await this.deleteFile(oldFilePath)
      } catch (_error) {
        // Ignorar error si el archivo antiguo no existe
        console.warn(`No se pudo eliminar archivo antiguo: ${oldFilePath}`)
      }
    }

    return result
  }
}
