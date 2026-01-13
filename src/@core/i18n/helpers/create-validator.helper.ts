import * as validator from 'class-validator'
import { ValidationMessageEnum } from '../constants/messages.constants'
import { getFieldName } from '../constants/field-names.constants'

/**
 * Extended validation options with optional field name override
 */
export interface ExtendedValidationOptions extends validator.ValidationOptions {
  fieldName?: string
}

/**
 * Creates a validation message with automatic field name translation
 */
export const createMessage = (
  messageKey: ValidationMessageEnum,
  customFieldName?: string,
) => {
  return (args: validator.ValidationArguments) => {
    // Get translated field name (auto-translate or use custom)
    const translatedField = customFieldName || getFieldName(args.property)

    let message = messageKey as string

    // Replace field name
    message = message.replace(/\{\{field\}\}/g, translatedField)

    // Replace value
    if (message.includes('{{value}}')) {
      let valueStr: string
      if (typeof args.value === 'object' && args.value !== null) {
        valueStr = JSON.stringify(args.value)
      } else if (args.value === null) {
        valueStr = 'null'
      } else if (args.value === undefined) {
        valueStr = 'undefined'
      } else {
        valueStr = String(args.value)
      }
      message = message.replace(/\{\{value\}\}/g, valueStr)
    }

    // Replace constraints
    if (args.constraints) {
      args.constraints.forEach((constraint: unknown, index: number) => {
        const placeholder = `{{constraint${index + 1}}}`
        if (message.includes(placeholder)) {
          let constraintStr: string

          if (constraint instanceof Date) {
            constraintStr = constraint.toLocaleDateString()
          } else if (Array.isArray(constraint)) {
            constraintStr = constraint.join(', ')
          } else if (typeof constraint === 'object' && constraint !== null) {
            constraintStr = JSON.stringify(constraint)
          } else {
            constraintStr = String(constraint)
          }

          message = message.replace(
            new RegExp(`\\{\\{constraint${index + 1}\\}\\}`, 'g'),
            constraintStr,
          )
        }
      })

      // Special placeholders for min/max
      const constraint1 = args.constraints[0] as unknown
      const constraint2 = args.constraints[1] as unknown

      const getConstraintString = (constraint: unknown): string => {
        if (constraint === null || constraint === undefined) return ''
        if (
          typeof constraint === 'string' ||
          typeof constraint === 'number' ||
          typeof constraint === 'boolean'
        ) {
          return String(constraint)
        }
        if (constraint instanceof Date) {
          return constraint.toLocaleDateString()
        }
        return JSON.stringify(constraint)
      }

      const constraint1Str = getConstraintString(constraint1)
      const constraint2Str =
        constraint2 !== null && constraint2 !== undefined
          ? getConstraintString(constraint2)
          : constraint1Str

      message = message.replace(/\{\{min\}\}/g, constraint1Str)
      message = message.replace(/\{\{max\}\}/g, constraint2Str)
    }

    return message
  }
}

/**
 * Universal validator creator
 *
 * Creates a Spanish validator wrapper for any class-validator decorator.
 * Handles automatic field name translation and message creation.
 *
 * @param validatorFn - The original class-validator function
 * @param messageKey - The Spanish message template
 * @returns A wrapper function that applies Spanish messages
 */
export const createValidator = <TArgs extends unknown[]>(
  validatorFn: (...args: unknown[]) => PropertyDecorator,
  messageKey: ValidationMessageEnum,
) => {
  return (...args: TArgs): PropertyDecorator => {
    // Find validation options (always last argument or undefined)
    let validationOptions: ExtendedValidationOptions | undefined
    let otherArgs: unknown[] = []

    // Check if last argument is validation options
    const lastArg = args[args.length - 1]
    if (
      lastArg &&
      typeof lastArg === 'object' &&
      !Array.isArray(lastArg) &&
      ('message' in lastArg ||
        'groups' in lastArg ||
        'always' in lastArg ||
        'each' in lastArg ||
        'context' in lastArg ||
        'fieldName' in lastArg)
    ) {
      validationOptions = lastArg as ExtendedValidationOptions
      otherArgs = args.slice(0, -1)
    } else {
      validationOptions = undefined
      otherArgs = args as unknown[]
    }

    // Extract fieldName and create final options
    const { fieldName, ...restOptions } = validationOptions || {}

    const finalOptions: validator.ValidationOptions = {
      ...restOptions,
      message: restOptions.message || createMessage(messageKey, fieldName),
    }

    // Call original validator with all arguments plus final options
    return validatorFn(...otherArgs, finalOptions)
  }
}
