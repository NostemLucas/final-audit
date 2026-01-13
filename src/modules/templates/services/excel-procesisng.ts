import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import {
  validate,
  ValidationError as ClassValidatorError,
} from 'class-validator'
import { plainToInstance, ClassConstructor } from 'class-transformer'
import * as XLSX from 'xlsx'
import { CreateTemplateDto } from '../../template/dto'
import { CreateDomainDto, ExcelDomainDto } from 'src/config-audit/domain/dto'

import { CriterionDto, ExcelCriterionDto } from 'src/config-audit/criterion/dto'
import { TemplateService } from '../../template/service/template.service'
import { DomainService } from 'src/config-audit/domain/service'

import { CriterionService } from 'src/config-audit/criterion/service/criterion.service'
import { DataSource, EntityManager } from 'typeorm'
import { CreateControlDto, ExcelControlDto } from 'src/config-audit/control/dto'
import { ControlService } from 'src/config-audit/control/service'

interface SheetConfig<T extends Record<string, any> = Record<string, any>> {
  dto: ClassConstructor<T>
  mapping: Record<string, string>
  requiredColumns: string[]
  crossValidationFields?: Array<{
    field: string
    referenceSheet: keyof typeof SHEET_CONFIG
    referenceField: string
  }>
}

interface SheetConfigs {
  Plantillas: SheetConfig<CreateTemplateDto>
  Dominios: SheetConfig<ExcelDomainDto>
  Controles: SheetConfig<ExcelControlDto>
  Criterios: SheetConfig<ExcelCriterionDto>
}

const SHEET_CONFIG: SheetConfigs = {
  Plantillas: {
    dto: CreateTemplateDto,
    mapping: {
      nombre: 'name',
      descripcion: 'description',
      version: 'version',
    },
    requiredColumns: ['nombre', 'descripcion', 'version'],
  },
  Dominios: {
    dto: ExcelDomainDto,
    mapping: {
      codigo: 'code',
      nombre: 'name',
      descripcion: 'description',
      orden: 'order',
    },
    requiredColumns: ['codigo', 'nombre', 'descripcion', 'orden'],
  },
  Controles: {
    dto: ExcelControlDto,
    mapping: {
      codigo: 'code',
      nombre: 'name',
      descripcion: 'description',
      codigo_dominio: 'domainCode',
      orden: 'order',
    },
    requiredColumns: [
      'codigo',
      'nombre',
      'descripcion',
      'codigo_dominio',
      'orden',
    ],
    crossValidationFields: [
      {
        field: 'domainCode',
        referenceSheet: 'Dominios',
        referenceField: 'code',
      },
    ],
  },
  Criterios: {
    dto: ExcelCriterionDto,
    mapping: {
      codigo: 'code',
      nombre: 'name',
      descripcion: 'description',
      codigo_control: 'controlCode',
      codigo_padre: 'parentCode',
      orden: 'order',
    },
    requiredColumns: [
      'codigo',
      'nombre',
      'descripcion',
      'codigo_control',
      'codigo_padre',
      'orden',
    ],
    crossValidationFields: [
      {
        field: 'controlCode',
        referenceSheet: 'Controles',
        referenceField: 'code',
      },
      {
        field: 'parentCode',
        referenceSheet: 'Criterios',
        referenceField: 'code',
      },
    ],
  },
} as const

export interface ValidationError {
  row: number
  field: string
  value: unknown
  message: string
}

interface SheetResult<T extends Record<string, any> = Record<string, any>> {
  sheetName: string
  validData: T[]
  errors: ValidationError[]
  totalRows: number
}

export interface ProcessResult {
  success: boolean
  templates: {
    data: CreateTemplateDto[]
    errors: ValidationError[]
    totalRows: number
  }
  domains: {
    data: ExcelDomainDto[]
    errors: ValidationError[]
    totalRows: number
  }
  controls: {
    data: ExcelControlDto[]
    errors: ValidationError[]
    totalRows: number
  }
  criteria: {
    data: ExcelCriterionDto[]
    errors: ValidationError[]
    totalRows: number
  }
  crossValidationErrors: ValidationError[]
  summary: {
    totalSheets: number
    totalRows: number
    totalValidRows: number
    totalErrors: number
  }
}

@Injectable()
export class ExcelProcessorService {
  private readonly logger = new Logger(ExcelProcessorService.name)
  constructor(
    private readonly dataSource: DataSource,
    private readonly templateService: TemplateService,
    private readonly domainService: DomainService,
    private readonly controlService: ControlService,
    private readonly criterionService: CriterionService,
  ) {}

  async processExcelFile(fileBuffer: Buffer): Promise<ProcessResult> {
    try {
      this.logger.log('Iniciando procesamiento de archivo Excel')
      const workbook = this.parseWorkbook(fileBuffer)
      const results = await this.processAllSheets(workbook)
      const crossValidationErrors = this.performCrossValidation(results)

      const processResult = this.createProcessResult(
        results,
        crossValidationErrors,
      )

      this.logger.log(
        `Procesamiento completado. Éxito: ${processResult.success}`,
      )
      return processResult
    } catch (error) {
      this.logger.error('Error procesando archivo Excel', error.stack)
      throw new BadRequestException(
        'Error procesando archivo Excel. Verifique que el formato sea válido.',
      )
    }
  }

  generateExcelTemplate(): Buffer {
    const workbook = XLSX.utils.book_new()

    Object.entries(SHEET_CONFIG).forEach(([sheetName, config]) => {
      const worksheet = this.createTemplateWorksheet(config.requiredColumns)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }

  async processResults(fileBuffer: Buffer): Promise<ProcessResult> {
    const processResult = await this.processExcelFile(fileBuffer)
    if (processResult.success) {
      await this.dataSource.transaction(async (manager) => {
        const { controls, criteria, domains, templates } = processResult

        // 1. Crear y guardar el template
        const templateDto = new CreateTemplateDto()
        templateDto.description = templates.data[0].description
        templateDto.name = templates.data[0].name
        templateDto.version = templates.data[0].version

        const savedTemplate = await this.templateService.create(
          templateDto,
          manager,
        )

        // 2. Crear y guardar los dominios
        const domainsDto = domains.data.map((item) => {
          const domain = new CreateDomainDto()
          domain.code = item.code
          domain.name = item.name
          domain.description = item.description
          domain.order = item.order
          domain.templateId = savedTemplate.id
          return domain
        })

        const savedDomains = await Promise.all(
          domainsDto.map(async (item) => await this.domainService.create(item)),
        )

        // 3. Crear mapas de códigos a IDs
        const domainCodeToIdMap = new Map<string, string>()
        savedDomains.forEach((savedDomain) => {
          domainCodeToIdMap.set(savedDomain.code, savedDomain.id)
        })

        // 4. Crear y guardar los controles
        const controlsDto = controls.data.map((item) => {
          const domainId = domainCodeToIdMap.get(item.domainCode)
          if (!domainId) {
            throw new Error(
              `No se encontró el dominio con código: ${item.domainCode}`,
            )
          }

          const control = new CreateControlDto()
          control.code = item.code
          control.name = item.name
          control.description = item.description
          control.domainId = domainId
          return control
        })

        const savedControls = await Promise.all(
          controlsDto.map(
            async (item) => await this.controlService.create(item),
          ),
        )

        // 5. Crear mapa de controles
        const controlCodeToIdMap = new Map<string, string>()
        savedControls.forEach((savedControl) => {
          controlCodeToIdMap.set(savedControl.code, savedControl.id)
        })

        // 6. Procesar criterios en dos fases: primero padres, luego hijos
        await this.processCriteriaInPhases(criteria.data, controlCodeToIdMap)

        this.logger.log(`Procesamiento completado exitosamente`)
      })
    }

    return processResult
  }

  private async processCriteriaInPhases(
    criteriaData: ExcelCriterionDto[],
    controlCodeToIdMap: Map<string, string>,
  ): Promise<void> {
    // Separar criterios padre de subcriterios
    const criteriaParents = criteriaData.filter((item) => !item.parentCode)
    const criteriaChildren = criteriaData.filter((item) => item.parentCode)

    // Fase 1: Guardar criterios padre
    const savedParents = await this.saveCriteria(
      criteriaParents,
      controlCodeToIdMap,
      undefined,
    )

    // Crear mapa de códigos de criterios a IDs
    const criterionCodeToIdMap = new Map<string, string>()
    savedParents.forEach((savedCriterion) => {
      criterionCodeToIdMap.set(savedCriterion.code, savedCriterion.id)
    })

    // Fase 2: Guardar subcriterios con referencia al padre
    await this.saveCriteria(
      criteriaChildren,
      controlCodeToIdMap,
      criterionCodeToIdMap,
    )
  }

  private async saveCriteria(
    criteriaData: ExcelCriterionDto[],
    controlCodeToIdMap: Map<string, string>,
    criterionCodeToIdMap?: Map<string, string>,
  ): Promise<any[]> {
    const criteriaDto = criteriaData.map((item) => {
      const controlId = controlCodeToIdMap.get(item.controlCode)
      if (!controlId) {
        throw new Error(
          `No se encontró el control con código: ${item.controlCode}`,
        )
      }

      const criterion = new CriterionDto()
      criterion.code = item.code
      criterion.name = item.name
      criterion.description = item.description
      criterion.order = item.order
      criterion.controlId = controlId

      // Si es un subcriterio (tiene parentCode) y tenemos el mapa de padres
      if (item.parentCode && criterionCodeToIdMap) {
        const parentId = criterionCodeToIdMap.get(item.parentCode)
        if (!parentId) {
          throw new Error(
            `No se encontró el criterio padre con código: ${item.parentCode}`,
          )
        }
        criterion.parentCriterionId = parentId
      }

      return criterion
    })

    return await Promise.all(
      criteriaDto.map(async (item) => await this.criterionService.create(item)),
    )
  }

  private createProcessResult(
    results: SheetResult[],
    crossValidationErrors: ValidationError[],
  ): ProcessResult {
    const processResult: ProcessResult = {
      success: false,
      templates: {
        data: [],
        errors: [],
        totalRows: 0,
      },
      domains: {
        data: [],
        errors: [],
        totalRows: 0,
      },
      controls: {
        data: [],
        errors: [],
        totalRows: 0,
      },
      criteria: {
        data: [],
        errors: [],
        totalRows: 0,
      },
      crossValidationErrors,
      summary: {
        totalSheets: results.length,
        totalRows: 0,
        totalValidRows: 0,
        totalErrors: crossValidationErrors.length,
      },
    }

    results.forEach((result) => {
      switch (result.sheetName) {
        case 'Plantillas':
          processResult.templates = {
            data: result.validData as CreateTemplateDto[],
            errors: result.errors,
            totalRows: result.totalRows,
          }
          break
        case 'Dominios':
          processResult.domains = {
            data: result.validData as ExcelDomainDto[],
            errors: result.errors,
            totalRows: result.totalRows,
          }
          break
        case 'Controles':
          processResult.controls = {
            data: result.validData as ExcelControlDto[],
            errors: result.errors,
            totalRows: result.totalRows,
          }
          break
        case 'Criterios':
          processResult.criteria = {
            data: result.validData as ExcelCriterionDto[],
            errors: result.errors,
            totalRows: result.totalRows,
          }
          break
      }
    })

    processResult.summary.totalRows =
      processResult.templates.totalRows +
      processResult.domains.totalRows +
      processResult.controls.totalRows +
      processResult.criteria.totalRows

    processResult.summary.totalValidRows =
      processResult.templates.data.length +
      processResult.domains.data.length +
      processResult.controls.data.length +
      processResult.criteria.data.length

    processResult.summary.totalErrors =
      processResult.templates.errors.length +
      processResult.domains.errors.length +
      processResult.controls.errors.length +
      processResult.criteria.errors.length +
      processResult.crossValidationErrors.length

    processResult.success = processResult.summary.totalErrors === 0

    return processResult
  }

  private parseWorkbook(fileBuffer: Buffer): XLSX.WorkBook {
    return XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
  }

  private async processAllSheets(
    workbook: XLSX.WorkBook,
  ): Promise<SheetResult[]> {
    const results: SheetResult[] = []

    for (const [sheetName, config] of Object.entries(SHEET_CONFIG)) {
      if (workbook.SheetNames.includes(sheetName)) {
        const result = await this.processSheet(
          workbook.Sheets[sheetName],
          sheetName,
          config,
        )
        results.push(result)
      } else {
        results.push({
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
        })
      }
    }

    return results
  }

  private async processSheet<T extends Record<string, any>>(
    worksheet: XLSX.WorkSheet,
    sheetName: string,
    config: SheetConfig<T>,
  ): Promise<SheetResult<T>> {
    const rawData = this.extractRawData(worksheet)

    if (rawData.length === 0) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 0,
            field: 'sheet',
            value: sheetName,
            message: 'Hoja vacía',
          },
        ],
        totalRows: 0,
      }
    }

    const [headers, ...dataRows] = rawData
    const headerMapping = this.validateAndMapHeaders(headers, config)

    if (!headerMapping) {
      return {
        sheetName,
        validData: [],
        errors: [
          {
            row: 1,
            field: 'headers',
            value: headers.join(', '),
            message: `Columnas requeridas faltantes. Se requieren: ${config.requiredColumns.join(', ')}`,
          },
        ],
        totalRows: dataRows.length + 1,
      }
    }

    return await this.processDataRows(
      sheetName,
      dataRows,
      headerMapping,
      config.dto,
    )
  }

  private extractRawData(worksheet: XLSX.WorkSheet): string[][] {
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][]

    return data.filter((row) =>
      row.some((cell) => cell && cell.toString().trim() !== ''),
    )
  }

  private validateAndMapHeaders(
    headers: string[],
    config: SheetConfig,
  ): Record<number, string> | null {
    const cleanHeaders = headers
      .map((header) => this.normalizeString(header))
      .filter((header) => header !== '')

    const missingColumns = config.requiredColumns.filter(
      (required) => !cleanHeaders.includes(required),
    )

    if (missingColumns.length > 0) {
      return null
    }

    const mapping: Record<number, string> = {}
    headers.forEach((header, index) => {
      const normalizedHeader = this.normalizeString(header)
      const mappedField = config.mapping[normalizedHeader]
      if (mappedField) {
        mapping[index] = mappedField
      }
    })

    return mapping
  }

  private async processDataRows<T extends Record<string, any>>(
    sheetName: string,
    dataRows: string[][],
    headerMapping: Record<number, string>,
    DtoClass: ClassConstructor<T>,
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

      if (value && value.trim() !== '') {
        obj[fieldName] = this.convertValue(value.trim())
      }
    })

    return obj
  }

  private convertValue(value: string): any {
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10)
    }

    if (/^\d*\.\d+$/.test(value)) {
      return parseFloat(value)
    }

    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false

    return value
  }

  private async validateRowObject<T extends Record<string, any>>(
    rowData: Record<string, unknown>,
    DtoClass: ClassConstructor<T>,
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
          message: `Error procesando fila: ${error.message}`,
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

  private performCrossValidation(results: SheetResult[]): ValidationError[] {
    const errors: ValidationError[] = []
    const dataBySheet = this.indexDataBySheet(results)

    Object.entries(SHEET_CONFIG).forEach(([sheetName, config]) => {
      if (!config.crossValidationFields) return

      const sheetData = dataBySheet[sheetName]
      if (!sheetData) return

      config.crossValidationFields.forEach((validation) => {
        const referenceData = dataBySheet[validation.referenceSheet]
        if (!referenceData) return

        const referenceValues = new Set(
          referenceData.map((item) => item[validation.referenceField]),
        )

        sheetData.forEach((item, index) => {
          const value = item[validation.field]
          if (value && !referenceValues.has(value)) {
            errors.push({
              row: index + 2,
              field: `${sheetName}.${validation.field}`,
              value,
              message: `Referencia no encontrada: ${value} no existe en ${validation.referenceSheet}`,
            })
          }
        })
      })
    })

    return errors
  }

  private indexDataBySheet(
    results: SheetResult[],
  ): Record<string, Record<string, any>[]> {
    const indexed: Record<string, Record<string, any>[]> = {}

    results.forEach((result) => {
      if (result.validData.length > 0) {
        indexed[result.sheetName] = result.validData
      }
    })

    return indexed
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

  private createTemplateWorksheet(headers: string[]): XLSX.WorkSheet {
    const worksheet = XLSX.utils.aoa_to_sheet([headers])

    const exampleRows = Array(3)
      .fill(null)
      .map(() => Array(headers.length).fill('(ejemplo)'))

    XLSX.utils.sheet_add_aoa(worksheet, exampleRows, { origin: 'A2' })

    return worksheet
  }
}
