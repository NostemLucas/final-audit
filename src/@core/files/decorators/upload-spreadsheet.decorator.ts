import { FileType } from '../enums/file-type.enum'
import {
  createUploadDecorator,
  UploadFileDecoratorOptions,
} from './upload-file.decorator'

/**
 * Decorador para subir hojas de cálculo (XLS, XLSX, CSV)
 *
 * @example
 * // Una hoja de cálculo
 * @Post(':id/data')
 * @UploadSpreadsheet({ fieldName: 'data', maxSize: 15 * 1024 * 1024 })
 * async uploadData(
 *   @Param('id') id: string,
 *   @UploadedFile() file: Express.Multer.File,
 * ) {
 *   // ...
 * }
 *
 * @example
 * // Múltiples hojas de cálculo
 * @Post('import')
 * @UploadSpreadsheet({ fieldName: 'files', maxFiles: 5 })
 * async importData(
 *   @UploadedFiles() files: Express.Multer.File[],
 * ) {
 *   // ...
 * }
 */
export function UploadSpreadsheet(options: UploadFileDecoratorOptions = {}) {
  return createUploadDecorator({
    ...options,
    fileType: FileType.SPREADSHEET,
    defaultFieldName: 'spreadsheet',
    defaultMaxSize: 15 * 1024 * 1024, // 15MB default
  })
}
