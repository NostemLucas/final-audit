/**
 * Tipos de archivos soportados
 */
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  PDF = 'pdf',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/**
 * MIME types permitidos por categoría
 */
export const ALLOWED_MIME_TYPES: Record<FileType, string[]> = {
  [FileType.IMAGE]: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  [FileType.DOCUMENT]: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  [FileType.SPREADSHEET]: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  [FileType.PDF]: ['application/pdf'],
  [FileType.VIDEO]: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
  ],
  [FileType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
}

/**
 * Extensiones de archivo por tipo
 */
export const FILE_EXTENSIONS: Record<FileType, string[]> = {
  [FileType.IMAGE]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  [FileType.DOCUMENT]: ['.doc', '.docx', '.txt'],
  [FileType.SPREADSHEET]: ['.xls', '.xlsx', '.csv'],
  [FileType.PDF]: ['.pdf'],
  [FileType.VIDEO]: ['.mp4', '.mpeg', '.mov', '.webm'],
  [FileType.AUDIO]: ['.mp3', '.wav', '.ogg', '.webm'],
}
