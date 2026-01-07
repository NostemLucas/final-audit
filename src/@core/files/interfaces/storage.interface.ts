/**
 * Opciones para guardar un archivo
 */
export interface SaveFileOptions {
  /**
   * Buffer del archivo
   */
  buffer: Buffer

  /**
   * Nombre original del archivo
   */
  originalName: string

  /**
   * MIME type del archivo
   */
  mimeType: string

  /**
   * Carpeta destino (relativa a la raíz de uploads)
   * Ejemplo: 'avatars/users', 'documents/2024'
   */
  folder: string

  /**
   * Nombre personalizado del archivo (sin extensión)
   * Si no se proporciona, se genera uno único
   */
  customFileName?: string

  /**
   * Si true, sobrescribe el archivo si ya existe
   * Por defecto: false
   */
  overwrite?: boolean
}

/**
 * Resultado de guardar un archivo
 */
export interface SaveFileResult {
  /**
   * Nombre del archivo guardado (con extensión)
   */
  fileName: string

  /**
   * Path completo del archivo (relativo a uploads)
   * Ejemplo: 'avatars/users/user-123.jpg'
   */
  filePath: string

  /**
   * URL pública para acceder al archivo
   * Ejemplo: 'http://localhost:3000/uploads/avatars/users/user-123.jpg'
   */
  url: string

  /**
   * Tamaño del archivo en bytes
   */
  size: number

  /**
   * MIME type del archivo
   */
  mimeType: string
}

/**
 * Opciones para eliminar un archivo
 */
export interface DeleteFileOptions {
  /**
   * Path del archivo a eliminar (relativo a uploads)
   * Ejemplo: 'avatars/users/user-123.jpg'
   */
  filePath: string
}

/**
 * Interface del servicio de almacenamiento
 */
export interface IStorageService {
  /**
   * Guarda un archivo en el sistema de almacenamiento
   */
  saveFile(options: SaveFileOptions): Promise<SaveFileResult>

  /**
   * Elimina un archivo del sistema de almacenamiento
   */
  deleteFile(options: DeleteFileOptions): Promise<void>

  /**
   * Verifica si un archivo existe
   */
  fileExists(filePath: string): Promise<boolean>

  /**
   * Obtiene la URL pública de un archivo
   */
  getFileUrl(filePath: string): string
}
