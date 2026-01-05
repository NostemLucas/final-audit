import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import {
  IStorageService,
  SaveFileOptions,
  SaveFileResult,
  DeleteFileOptions,
} from '../interfaces/storage.interface'

/**
 * Implementación de almacenamiento local
 * Guarda archivos en el sistema de archivos del servidor
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name)
  private readonly uploadsDir: string
  private readonly baseUrl: string

  constructor(private readonly configService: ConfigService) {
    // Directorio raíz para uploads (por defecto: ./uploads)
    this.uploadsDir =
      this.configService.get<string>('UPLOADS_DIR') ||
      path.join(process.cwd(), 'uploads')

    // URL base para acceder a los archivos
    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000'
    this.baseUrl = `${appUrl}/uploads`

    // Crear directorio de uploads si no existe
    this.ensureUploadsDirExists().catch((error) => {
      this.logger.error(
        `Error creando directorio de uploads: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    })
  }

  /**
   * Guarda un archivo en el sistema local
   */
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    try {
      // 1. Generar nombre de archivo único
      const fileName = this.generateFileName(
        options.originalName,
        options.customFileName,
      )

      // 2. Crear path completo
      const folderPath = path.join(this.uploadsDir, options.folder)
      const filePath = path.join(options.folder, fileName)
      const fullPath = path.join(this.uploadsDir, filePath)

      // 3. Verificar si el archivo ya existe
      if (!options.overwrite) {
        const exists = await this.fileExists(filePath)
        if (exists) {
          throw new Error(
            `El archivo ${fileName} ya existe en ${options.folder}`,
          )
        }
      }

      // 4. Crear carpeta si no existe
      await fs.mkdir(folderPath, { recursive: true })

      // 5. Guardar archivo
      await fs.writeFile(fullPath, options.buffer)

      this.logger.log(`Archivo guardado: ${filePath}`)

      // 6. Retornar resultado
      return {
        fileName,
        filePath,
        url: this.getFileUrl(filePath),
        size: options.buffer.length,
        mimeType: options.mimeType,
      }
    } catch (error) {
      this.logger.error(`Error guardando archivo: ${error}`)
      throw new Error(
        `Error al guardar archivo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Elimina un archivo del sistema local
   */
  async deleteFile(options: DeleteFileOptions): Promise<void> {
    try {
      const fullPath = path.join(this.uploadsDir, options.filePath)

      // Verificar si el archivo existe
      const exists = await this.fileExists(options.filePath)
      if (!exists) {
        this.logger.warn(
          `Archivo no encontrado para eliminar: ${options.filePath}`,
        )
        return
      }

      // Eliminar archivo
      await fs.unlink(fullPath)

      this.logger.log(`Archivo eliminado: ${options.filePath}`)

      // Intentar eliminar carpeta si está vacía
      const folderPath = path.dirname(fullPath)
      await this.removeEmptyFolder(folderPath)
    } catch (error) {
      this.logger.error(`Error eliminando archivo: ${error}`)
      throw new Error(
        `Error al eliminar archivo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Verifica si un archivo existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadsDir, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  getFileUrl(filePath: string): string {
    // Normalizar separadores de path para URLs
    const normalizedPath = filePath.replace(/\\/g, '/')
    return `${this.baseUrl}/${normalizedPath}`
  }

  /**
   * Genera un nombre de archivo único
   */
  private generateFileName(
    originalName: string,
    customFileName?: string,
  ): string {
    const extension = this.getFileExtension(originalName)

    if (customFileName) {
      // Sanitizar nombre personalizado
      const sanitized = this.sanitizeFileName(customFileName)
      return `${sanitized}${extension}`
    }

    // Generar nombre único con UUID
    const uniqueName = `${uuidv4()}${extension}`
    return uniqueName
  }

  /**
   * Obtiene la extensión de un archivo
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? `.${parts.pop()}` : ''
  }

  /**
   * Sanitiza un nombre de archivo
   * Remueve caracteres especiales y espacios
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/[^a-z0-9-_.]/g, '') // Solo alfanuméricos, guiones, puntos, underscores
      .replace(/-+/g, '-') // Múltiples guiones a uno solo
      .replace(/^-|-$/g, '') // Remover guiones al inicio/fin
  }

  /**
   * Asegura que el directorio de uploads exista
   */
  private async ensureUploadsDirExists(): Promise<void> {
    try {
      await fs.access(this.uploadsDir)
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true })
      this.logger.log(`Directorio de uploads creado: ${this.uploadsDir}`)
    }
  }

  /**
   * Elimina una carpeta si está vacía
   */
  private async removeEmptyFolder(folderPath: string): Promise<void> {
    try {
      // No eliminar el directorio raíz de uploads
      if (folderPath === this.uploadsDir) {
        return
      }

      const files = await fs.readdir(folderPath)

      if (files.length === 0) {
        await fs.rmdir(folderPath)
        this.logger.log(`Carpeta vacía eliminada: ${folderPath}`)

        // Intentar eliminar carpeta padre si también está vacía
        const parentFolder = path.dirname(folderPath)
        await this.removeEmptyFolder(parentFolder)
      }
    } catch {
      // Ignorar errores al intentar eliminar carpetas
    }
  }
}
