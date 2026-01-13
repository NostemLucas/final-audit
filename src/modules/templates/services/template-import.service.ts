import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import {
  validate,
  ValidationError as ClassValidatorError,
} from 'class-validator'
import { plainToInstance } from 'class-transformer'
import * as XLSX from 'xlsx'
import { ImportStandardDto, ImportTemplateMetadataDto } from '../dtos'
import { DataSource } from 'typeorm'
import { TemplatesRepository } from '../repositories/templates.repository'
import { StandardsRepository } from '../repositories/standards.repository'
import { TransactionService } from '@core/database'

/**
 * ✅ Template Import Service (Refactored - Opción 2)
 *
 * Imports templates with recursive standards:
 * - Template metadata (name, description, version) → Form fields
 * - Standards → Excel/CSV file with 1 sheet/file
 *
 * Structure:
 * - Standard (code, title, description, parentCode, order, level, isAuditable, isActive)
 *
 * Standards support hierarchy via parentCode field
 */

export interface ValidationError {
  row: number
  field: string
  value: unknown
  message: string
}

interface SheetResult<T extends object = object> {
  sheetName: string
  validData: T[]
  errors: ValidationError[]
  totalRows: number
}

export interface ImportResult {
  success: boolean
  standards: {
    data: ImportStandardDto[]
    errors: ValidationError[]
    totalRows: number
  }
  crossValidationErrors: ValidationError[]
  summary: {
    totalRows: number
    totalValidRows: number
    totalErrors: number
  }
}

@Injectable()
export class TemplateImportService {
  private readonly logger = new Logger(TemplateImportService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly templatesRepository: TemplatesRepository,
    private readonly standardsRepository: StandardsRepository,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Process Excel file with 1 sheet: Estándares
   */
  async processExcelFile(fileBuffer: Buffer): Promise<ImportResult> {
    try {
      this.logger.log('Iniciando procesamiento de archivo Excel')
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
      })

      const standardsResult = await this.processStandardsSheet(workbook)

      const crossValidationErrors = this.performCrossValidation(standardsResult)

      const importResult = this.createImportResult(
        standardsResult,
        crossValidationErrors,
      )

      this.logger.log(
        `Procesamiento Excel completado. Éxito: ${importResult.success}`,
      )
      return importResult
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error)
      this.logger.error('Error procesando archivo Excel', errorStack)
      throw new BadRequestException(
        'Error procesando archivo Excel. Verifique que el formato sea válido.',
      )
    }
  }

  /**
   * Process CSV file with standards
   */
  async processCSVFile(standardsCsv: string): Promise<ImportResult> {
    try {
      this.logger.log('Iniciando procesamiento de archivo CSV')

      const standardsResult = await this.processStandardsCSV(standardsCsv)

      const crossValidationErrors = this.performCrossValidation(standardsResult)

      const importResult = this.createImportResult(
        standardsResult,
        crossValidationErrors,
      )

      this.logger.log(
        `Procesamiento CSV completado. Éxito: ${importResult.success}`,
      )
      return importResult
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error)
      this.logger.error('Error procesando archivos CSV', errorStack)
      throw new BadRequestException(
        'Error procesando archivos CSV. Verifique que el formato sea válido.',
      )
    }
  }

  /**
   * Save validated import result to database
   * Processes in phases: Template → Parent Standards → Child Standards
   */
  async saveImportResult(
    templateMetadata: ImportTemplateMetadataDto,
    importResult: ImportResult,
  ): Promise<{
    templateId: string
    standardsCount: number
  }> {
    if (!importResult.success) {
      throw new BadRequestException(
        'No se puede guardar. El resultado contiene errores de validación.',
      )
    }

    return await this.transactionService.runInTransaction(async () => {
      // Phase 1: Create Template
      const savedTemplate = await this.templatesRepository.save({
        name: templateMetadata.name,
        description: templateMetadata.description,
        version: templateMetadata.version,
      })

      this.logger.log(`Template creado: ${savedTemplate.id}`)

      // Phase 2: Separate parent and child standards
      const parentStandards = importResult.standards.data.filter(
        (s) => !s.parentCode,
      )
      const childStandards = importResult.standards.data.filter(
        (s) => s.parentCode,
      )

      // Phase 3: Create parent standards first
      const codeToIdMap = new Map<string, string>()
      for (const standardData of parentStandards) {
        const savedStandard = await this.standardsRepository.save({
          ...standardData,
          templateId: savedTemplate.id,
          parentId: null,
        })
        codeToIdMap.set(standardData.code, savedStandard.id)
      }

      this.logger.log(`Estándares padre creados: ${parentStandards.length}`)

      // Phase 4: Create child standards with parent references
      for (const standardData of childStandards) {
        const parentId = codeToIdMap.get(standardData.parentCode!)
        if (!parentId) {
          throw new BadRequestException(
            `No se encontró el estándar padre con código: ${standardData.parentCode}`,
          )
        }

        const savedStandard = await this.standardsRepository.save({
          ...standardData,
          templateId: savedTemplate.id,
          parentId,
        })
        codeToIdMap.set(standardData.code, savedStandard.id)
      }

      this.logger.log(`Estándares hijo creados: ${childStandards.length}`)

      return {
        templateId: savedTemplate.id,
        standardsCount: importResult.standards.data.length,
      }
    })
  }

  /**
   * Generate Excel template file for users to fill (only standards)
   */
  generateExcelTemplate(): Buffer {
    const workbook = XLSX.utils.book_new()

    // Single sheet: Estándares
    const standardsHeaders = [
      'codigo',
      'titulo',
      'descripcion',
      'codigo_padre',
      'orden',
      'nivel',
      'es_auditable',
      'esta_activo',
    ]
    const standardsSheet = this.createTemplateWorksheet(standardsHeaders, [
      'A.1',
      'Control de acceso',
      'Descripción del control',
      '',
      '1',
      '1',
      'true',
      'true',
    ])
    XLSX.utils.book_append_sheet(workbook, standardsSheet, 'Estándares')

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  /**
   * Generate CSV template file (only standards)
   */
  generateCSVTemplate(): string {
    const standardsCsv = [
      'codigo,titulo,descripcion,codigo_padre,orden,nivel,es_auditable,esta_activo',
      'A.1,Control de acceso,Descripción del control,,1,1,true,true',
      'A.1.1,Subcontrol,Descripción del subcontrol,A.1,1,2,true,true',
    ].join('\n')

    return standardsCsv
  }

  // ========================================
  // Private Methods - Excel Processing
  // ========================================

  private async processStandardsSheet(
    workbook: XLSX.WorkBook,
  ): Promise<SheetResult<ImportStandardDto>> {
    const sheetName = 'Estándares'

    if (!workbook.SheetNames.includes(sheetName)) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 0,
            field: 'sheet',
            value: sheetName,
            message: `Hoja "${sheetName}" no encontrada en el archivo`,
          },
        ],
        totalRows: 0,
      }
    }

    const worksheet = workbook.Sheets[sheetName]
    const rawData = this.extractRawData(worksheet)

    if (rawData.length < 2) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 0,
            field: 'sheet',
            value: sheetName,
            message: 'Hoja vacía o sin datos',
          },
        ],
        totalRows: 0,
      }
    }

    const [headers, ...dataRows] = rawData
    const mapping = {
      codigo: 'code',
      titulo: 'title',
      descripcion: 'description',
      codigo_padre: 'parentCode',
      orden: 'order',
      nivel: 'level',
      es_auditable: 'isAuditable',
      esta_activo: 'isActive',
    }

    const headerMapping = this.createHeaderMapping(headers, mapping)

    if (!headerMapping) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 1,
            field: 'headers',
            value: headers.join(', '),
            message: `Columnas requeridas: codigo, titulo, descripcion, codigo_padre, orden, nivel, es_auditable, esta_activo`,
          },
        ],
        totalRows: dataRows.length,
      }
    }

    return await this.processDataRows(
      sheetName,
      dataRows,
      headerMapping,
      ImportStandardDto,
    )
  }

  // ========================================
  // Private Methods - CSV Processing
  // ========================================

  private async processStandardsCSV(
    csvContent: string,
  ): Promise<SheetResult<ImportStandardDto>> {
    const sheetName = 'Standards CSV'
    const rows = this.parseCSV(csvContent)

    if (rows.length < 2) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 0,
            field: 'csv',
            value: csvContent,
            message: 'CSV vacío o sin datos',
          },
        ],
        totalRows: 0,
      }
    }

    const [headers, ...dataRows] = rows
    const mapping = {
      codigo: 'code',
      titulo: 'title',
      descripcion: 'description',
      codigo_padre: 'parentCode',
      orden: 'order',
      nivel: 'level',
      es_auditable: 'isAuditable',
      esta_activo: 'isActive',
    }

    const headerMapping = this.createHeaderMapping(headers, mapping)

    if (!headerMapping) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 1,
            field: 'headers',
            value: headers.join(', '),
            message: `Columnas requeridas: codigo, titulo, descripcion, codigo_padre, orden, nivel, es_auditable, esta_activo`,
          },
        ],
        totalRows: dataRows.length,
      }
    }

    return await this.processDataRows(
      sheetName,
      dataRows,
      headerMapping,
      ImportStandardDto,
    )
  }

  // ========================================
  // Private Methods - Common Utilities
  // ========================================

  private parseCSV(csvContent: string): string[][] {
    const rows = csvContent
      .split('\n')
      .map((row) => row.trim())
      .filter((row) => row.length > 0)

    return rows.map((row) => {
      // Basic CSV parsing (handles commas inside quotes)
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g
      const values: string[] = []
      let match: RegExpExecArray | null

      while ((match = regex.exec(row)) !== null) {
        let value = match[1]
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"')
        }
        values.push(value.trim())
      }

      return values.filter((v) => v !== '')
    })
  }

  private extractRawData(worksheet: XLSX.WorkSheet): string[][] {
    const data = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    return data.filter((row) =>
      row.some((cell) => cell && cell.toString().trim() !== ''),
    )
  }

  private createHeaderMapping(
    headers: string[],
    mapping: Record<string, string>,
  ): Record<number, string> | null {
    const normalizedHeaders = headers.map((h) => this.normalizeString(h))
    const requiredColumns = Object.keys(mapping)

    const missingColumns = requiredColumns.filter(
      (required) => !normalizedHeaders.includes(required),
    )

    if (missingColumns.length > 0) {
      return null
    }

    const headerMapping: Record<number, string> = {}
    headers.forEach((header, index) => {
      const normalized = this.normalizeString(header)
      const mappedField = mapping[normalized]
      if (mappedField) {
        headerMapping[index] = mappedField
      }
    })

    return headerMapping
  }

  private async processDataRows<T extends object>(
    sheetName: string,
    dataRows: string[][],
    headerMapping: Record<number, string>,
    DtoClass: new () => T,
  ): Promise<SheetResult<T>> {
    const validData: T[] = []
    const errors: ValidationError[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowIndex = i + 2

      const rowObject = this.mapRowToObject(row, headerMapping)
      const rowErrors = await this.validateRowObject(
        rowObject,
        DtoClass,
        rowIndex,
      )

      if (rowErrors.length === 0) {
        validData.push(rowObject as T)
      } else {
        errors.push(...rowErrors)
      }
    }

    return {
      sheetName,
      validData,
      errors,
      totalRows: dataRows.length,
    }
  }

  private mapRowToObject(
    row: string[],
    headerMapping: Record<number, string>,
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {}

    Object.entries(headerMapping).forEach(([indexStr, fieldName]) => {
      const index = parseInt(indexStr)
      const value = row[index]

      if (
        value !== undefined &&
        value !== null &&
        value.toString().trim() !== ''
      ) {
        obj[fieldName] = this.convertValue(value.toString().trim())
      }
    })

    return obj
  }

  private convertValue(value: string): string | number | boolean {
    // Check for boolean
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false

    // Check for integer
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10)
    }

    // Check for float
    if (/^\d*\.\d+$/.test(value)) {
      return parseFloat(value)
    }

    return value
  }

  private async validateRowObject<T extends object>(
    rowData: Record<string, unknown>,
    DtoClass: new () => T,
    rowIndex: number,
  ): Promise<ValidationError[]> {
    try {
      const instance = plainToInstance(DtoClass, rowData, {
        enableImplicitConversion: true,
      })

      const validationErrors = await validate(instance as object)
      return this.mapValidationErrors(validationErrors, rowIndex)
    } catch (error) {
      return [
        {
          row: rowIndex,
          field: 'general',
          value: JSON.stringify(rowData),
          message: `Error procesando fila: ${(error as Error).message}`,
        },
      ]
    }
  }

  private mapValidationErrors(
    validationErrors: ClassValidatorError[],
    rowIndex: number,
  ): ValidationError[] {
    const errors: ValidationError[] = []

    validationErrors.forEach((error) => {
      const constraints = error.constraints || {}
      Object.entries(constraints).forEach(([, message]) => {
        errors.push({
          row: rowIndex,
          field: error.property,
          value: error.value,
          message,
        })
      })
    })

    return errors
  }

  private performCrossValidation(
    standardsResult: SheetResult<ImportStandardDto>,
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate parent codes exist
    const standardCodes = new Set(standardsResult.validData.map((s) => s.code))
    standardsResult.validData.forEach((standard, index) => {
      if (standard.parentCode && !standardCodes.has(standard.parentCode)) {
        errors.push({
          row: index + 2,
          field: 'parentCode',
          value: standard.parentCode,
          message: `Código padre no encontrado: ${standard.parentCode}`,
        })
      }
    })

    // Validate no circular references
    const circularErrors = this.detectCircularReferences(
      standardsResult.validData,
    )
    errors.push(...circularErrors)

    return errors
  }

  private detectCircularReferences(
    standards: ImportStandardDto[],
  ): ValidationError[] {
    const errors: ValidationError[] = []
    const codeToParent = new Map<string, string | undefined>()

    standards.forEach((s) => codeToParent.set(s.code, s.parentCode))

    standards.forEach((standard, index) => {
      const visited = new Set<string>()
      let current: string | undefined = standard.code

      while (current) {
        if (visited.has(current)) {
          errors.push({
            row: index + 2,
            field: 'parentCode',
            value: standard.parentCode,
            message: `Referencia circular detectada en: ${standard.code}`,
          })
          break
        }
        visited.add(current)
        current = codeToParent.get(current)
      }
    })

    return errors
  }

  private normalizeString(text: string): string {
    if (!text || typeof text !== 'string') return ''

    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9_]/g, '')
  }

  private createTemplateWorksheet(
    headers: string[],
    exampleRow: string[],
  ): XLSX.WorkSheet {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    return worksheet
  }

  private createImportResult(
    standardsResult: SheetResult<ImportStandardDto>,
    crossValidationErrors: ValidationError[],
  ): ImportResult {
    const importResult: ImportResult = {
      success: false,
      standards: {
        data: standardsResult.validData,
        errors: standardsResult.errors,
        totalRows: standardsResult.totalRows,
      },
      crossValidationErrors,
      summary: {
        totalRows: standardsResult.totalRows,
        totalValidRows: standardsResult.validData.length,
        totalErrors:
          standardsResult.errors.length + crossValidationErrors.length,
      },
    }

    importResult.success = importResult.summary.totalErrors === 0

    return importResult
  }
}
