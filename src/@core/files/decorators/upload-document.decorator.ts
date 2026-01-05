import { FileType } from '../enums/file-type.enum'
import {
  createUploadDecorator,
  UploadFileDecoratorOptions,
} from './upload-file.decorator'

/**
 * Decorador para subir documentos (DOC, DOCX, TXT)
 *
 * @example
 * // Un documento
 * @Post(':id/document')
 * @UploadDocument({ fieldName: 'document', maxSize: 10 * 1024 * 1024 })
 * async uploadDocument(
 *   @Param('id') id: string,
 *   @UploadedFile() file: Express.Multer.File,
 * ) {
 *   // ...
 * }
 *
 * @example
 * // Múltiples documentos
 * @Post(':id/documents')
 * @UploadDocument({ fieldName: 'documents', maxFiles: 5 })
 * async uploadDocuments(
 *   @Param('id') id: string,
 *   @UploadedFiles() files: Express.Multer.File[],
 * ) {
 *   // ...
 * }
 */
export function UploadDocument(options: UploadFileDecoratorOptions = {}) {
  return createUploadDecorator({
    ...options,
    fileType: FileType.DOCUMENT,
    defaultFieldName: 'document',
    defaultMaxSize: 10 * 1024 * 1024, // 10MB default
  })
}
