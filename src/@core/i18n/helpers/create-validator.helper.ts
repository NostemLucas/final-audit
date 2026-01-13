import * as validator from 'class-validator'
import { ValidationMessageEnum } from '../constants/messages.constants'
import { getFieldName } from '../constants/field-names.constants'

/**
 * Extended validation options with optional field name override
 */
export interface ExtendedValidationOptions
  extends validator.ValidationOptions {
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
      let valueStr = args.value
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
      args.constraints.forEach((constraint, index) => {
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
      const [constraint1, constraint2] = args.constraints
      message = message.replace(/\{\{min\}\}/g, String(constraint1 || ''))
      message = message.replace(
        /\{\{max\}\}/g,
        String(constraint2 || constraint1 || ''),
      )
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
export const createValidator = <TArgs extends any[]>(
  validatorFn: (...args: any[]) => PropertyDecorator,
  messageKey: ValidationMessageEnum,
) => {
  return (...args: TArgs): PropertyDecorator => {
    // Find validation options (always last argument or undefined)
    let validationOptions: ExtendedValidationOptions | undefined
    let otherArgs: any[] = []

    // Check if last argument is validation options
    const lastArg = args[args.length - 1]
    if (
      lastArg &&
      typeof lastArg === 'object' &&
      !Array.isArray(lastArg) &&
      (lastArg.message !== undefined ||
        lastArg.groups !== undefined ||
        lastArg.always !== undefined ||
        lastArg.each !== undefined ||
        lastArg.context !== undefined ||
        (lastArg as ExtendedValidationOptions).fieldName !== undefined)
    ) {
      validationOptions = lastArg
      otherArgs = args.slice(0, -1)
    } else {
      validationOptions = undefined
      otherArgs = args as any[]
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
