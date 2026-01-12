import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@core/logger'
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
 *
 * Características:
 * - Guarda archivos en sistema de archivos local
 * - Soporta directorios anidados (ej: uploads/users/avatars)
 * - Crea directorios automáticamente si no existen
 * - Genera nombres únicos con UUID
 * - Limpia carpetas vacías al eliminar archivos
 * - Usa LoggerService del proyecto para logging consistente
 *
 * Estructura de directorios:
 * uploads/
 *   ├── users/
 *   │   ├── avatars/
 *   │   └── documents/
 *   ├── organizations/
 *   │   └── logos/
 *   └── temp/
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadsDir: string
  private readonly baseUrl: string

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Directorio raíz para uploads (por defecto: ./uploads)
    this.uploadsDir =
      this.configService.get<string>('UPLOADS_DIR') ||
      path.join(process.cwd(), 'uploads')

    // URL base para acceder a los archivos
    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3001'
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
   *
   * Soporta directorios anidados:
   * - folder: 'users/avatars' → uploads/users/avatars/
   * - folder: 'organizations/org-123/documents' → uploads/organizations/org-123/documents/
   *
   * @throws Error si no se puede guardar el archivo
   */
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const startTime = Date.now()

    try {
      // 1. Validar y normalizar folder path
      const normalizedFolder = this.normalizeFolderPath(options.folder)

      // 2. Generar nombre de archivo único
      const fileName = this.generateFileName(
        options.originalName,
        options.customFileName,
      )

      // 3. Construir paths
      const folderPath = path.join(this.uploadsDir, normalizedFolder)
      const filePath = path.join(normalizedFolder, fileName)
      const fullPath = path.join(this.uploadsDir, filePath)

      // 4. Verificar si el archivo ya existe
      if (!options.overwrite) {
        const exists = await this.fileExists(filePath)
        if (exists) {
          throw new Error(
            `El archivo ${fileName} ya existe en ${normalizedFolder}`,
          )
        }
      }

      // 5. Crear toda la estructura de carpetas (subdirectorios anidados)
      await this.ensureDirectoryExists(folderPath)

      // 6. Guardar archivo
      await fs.writeFile(fullPath, options.buffer)

      const duration = Date.now() - startTime

      this.logger.log(
        `Archivo guardado: ${filePath} (${options.buffer.length} bytes, ${duration}ms)`,
      )

      // 7. Retornar resultado
      return {
        fileName,
        filePath,
        url: this.getFileUrl(filePath),
        size: options.buffer.length,
        mimeType: options.mimeType,
      }
    } catch (error) {
      this.logger.error(
        `Error guardando archivo ${options.originalName} en ${options.folder}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )

      throw new Error(
        `Error al guardar archivo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Elimina un archivo del sistema local
   * También intenta limpiar carpetas vacías recursivamente
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

      // Intentar eliminar carpetas vacías recursivamente
      const folderPath = path.dirname(fullPath)
      await this.removeEmptyFolders(folderPath)
    } catch (error) {
      this.logger.error(
        `Error eliminando archivo ${options.filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )

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
    // Normalizar separadores de path para URLs (Windows → Linux)
    const normalizedPath = filePath.replace(/\\/g, '/')
    return `${this.baseUrl}/${normalizedPath}`
  }

  /**
   * Genera un nombre de archivo único
   *
   * @param originalName Nombre original del archivo
   * @param customFileName Nombre personalizado (opcional)
   * @returns Nombre de archivo con extensión
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

    // Generar nombre único con UUID + timestamp para evitar colisiones
    const timestamp = Date.now()

    const uuid: string = uuidv4()
    const uniqueName = `${uuid}-${timestamp}${extension}`
    return uniqueName
  }

  /**
   * Obtiene la extensión de un archivo
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    if (parts.length > 1) {
      const extension = parts.pop()
      return extension ? `.${extension.toLowerCase()}` : ''
    }
    return ''
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
      .substring(0, 100) // Limitar longitud
  }

  /**
   * Normaliza un folder path
   * Remueve '..' y '.' para prevenir directory traversal
   *
   * @example
   * 'users/avatars' → 'users/avatars'
   * 'users/../../../etc/passwd' → 'users/etc/passwd'
   * './users/./avatars' → 'users/avatars'
   */
  private normalizeFolderPath(folder: string): string {
    // Normalizar separadores
    const normalized = folder.replace(/\\/g, '/')

    // Separar en partes y filtrar '..' y '.'
    const parts = normalized
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..')

    // Reconstruir path seguro
    return parts.join('/')
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
   * Crea un directorio y todos sus padres si no existen
   * Soporta directorios anidados: uploads/users/avatars/profile
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      this.logger.error(
        `Error creando directorio ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw error
    }
  }

  /**
   * Elimina carpetas vacías recursivamente
   * Se detiene al llegar al directorio raíz de uploads
   *
   * Útil para mantener limpia la estructura de directorios
   * cuando se eliminan archivos
   */
  private async removeEmptyFolders(folderPath: string): Promise<void> {
    try {
      // No eliminar el directorio raíz de uploads
      if (folderPath === this.uploadsDir) {
        return
      }

      // No eliminar si no está dentro de uploads (seguridad)
      if (!folderPath.startsWith(this.uploadsDir)) {
        return
      }

      // Verificar si la carpeta está vacía
      const files = await fs.readdir(folderPath)

      if (files.length === 0) {
        await fs.rmdir(folderPath)

        this.logger.debug(`Carpeta vacía eliminada: ${folderPath}`)

        // Intentar eliminar carpeta padre si también está vacía
        const parentFolder = path.dirname(folderPath)
        await this.removeEmptyFolders(parentFolder)
      }
    } catch {
      // Ignorar errores al intentar eliminar carpetas
      // (pueden estar en uso, tener permisos diferentes, etc.)
    }
  }
}
