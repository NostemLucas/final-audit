import { FileType } from '../enums/file-type.enum'
import {
  createUploadDecorator,
  UploadFileDecoratorOptions,
} from './upload-file.decorator'

/**
 * Decorador para subir PDFs
 *
 * @example
 * // Un PDF
 * @Post(':id/report')
 * @UploadPdf({ fieldName: 'report', maxSize: 20 * 1024 * 1024 })
 * async uploadReport(
 *   @Param('id') id: string,
 *   @UploadedFile() file: Express.Multer.File,
 * ) {
 *   // ...
 * }
 *
 * @example
 * // Múltiples PDFs
 * @Post(':id/attachments')
 * @UploadPdf({ fieldName: 'attachments', maxFiles: 10 })
 * async uploadAttachments(
 *   @Param('id') id: string,
 *   @UploadedFiles() files: Express.Multer.File[],
 * ) {
 *   // ...
 * }
 */
export function UploadPdf(options: UploadFileDecoratorOptions = {}) {
  return createUploadDecorator({
    ...options,
    fileType: FileType.PDF,
    defaultFieldName: 'pdf',
    defaultMaxSize: 20 * 1024 * 1024, // 20MB default
  })
}
