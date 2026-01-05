import { applyDecorators, UseInterceptors } from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiBody } from '@nestjs/swagger'
import { FileType, FILE_EXTENSIONS } from '../enums/file-type.enum'

/**
 * Opciones base para decoradores de upload
 */
export interface UploadFileDecoratorOptions {
  /**
   * Nombre del campo en el formulario
   * Default: depende del decorador ('image', 'document', etc.)
   */
  fieldName?: string

  /**
   * Cantidad máxima de archivos
   * Default: 1 (FileInterceptor)
   * Si > 1, usa FilesInterceptor
   */
  maxFiles?: number

  /**
   * Tamaño máximo por archivo en bytes
   * Default: depende del tipo de archivo
   */
  maxSize?: number

  /**
   * Si el archivo es requerido
   * Default: true
   */
  required?: boolean

  /**
   * Descripción para Swagger
   */
  description?: string
}

/**
 * Opciones internas que incluyen el tipo de archivo
 */
interface InternalUploadOptions extends UploadFileDecoratorOptions {
  fileType: FileType
  defaultFieldName: string
  defaultMaxSize: number
  allowedExtensions?: string[]
}

/**
 * Función helper para crear decoradores de upload
 * Combina: @UseInterceptors, @ApiConsumes, @ApiBody
 */
export function createUploadDecorator(options: InternalUploadOptions) {
  const {
    fieldName = options.defaultFieldName,
    maxFiles = 1,
    maxSize = options.defaultMaxSize,
    required = true,
    description,
    fileType,
    allowedExtensions = FILE_EXTENSIONS[fileType],
  } = options

  const decorators: Array<MethodDecorator | ClassDecorator> = []

  // 1. Interceptor de Multer
  if (maxFiles === 1) {
    decorators.push(UseInterceptors(FileInterceptor(fieldName)))
  } else {
    decorators.push(UseInterceptors(FilesInterceptor(fieldName, maxFiles)))
  }

  // 2. Swagger: Tipo de contenido
  decorators.push(ApiConsumes('multipart/form-data'))

  // 3. Swagger: Schema del body
  const extensionsText = allowedExtensions.join(', ')
  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)

  decorators.push(
    ApiBody({
      required,
      description:
        description ||
        `Subir ${maxFiles === 1 ? 'un archivo' : `hasta ${maxFiles} archivos`}. ` +
          `Formatos permitidos: ${extensionsText}. ` +
          `Tamaño máximo: ${maxSizeMB}MB por archivo.`,
      schema: {
        type: 'object',
        properties: {
          [fieldName]:
            maxFiles === 1
              ? {
                  type: 'string',
                  format: 'binary',
                  description: `Archivo (${extensionsText})`,
                }
              : {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'binary',
                  },
                  description: `Archivos (${extensionsText})`,
                  maxItems: maxFiles,
                },
        },
        required: required ? [fieldName] : [],
      },
    }),
  )

  return applyDecorators(...decorators)
}
