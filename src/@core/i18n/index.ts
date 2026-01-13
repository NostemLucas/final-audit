/**
 * Spanish i18n for class-validator
 *
 * This module provides Spanish validation messages with automatic
 * field name translation for all class-validator decorators.
 *
 * Usage:
 * ```typescript
 * import { IsString, MinLength } from '@core/i18n'
 *
 * class CreateUserDto {
 *   @IsString()
 *   @MinLength(2)
 *   names: string  // Error: "El campo nombres debe tener al menos 2 caracteres"
 * }
 * ```
 *
 * Custom field name:
 * ```typescript
 * @MinLength(2, { fieldName: 'nombre completo' })
 * fullName: string  // Error: "El campo nombre completo debe tener al menos 2 caracteres"
 * ```
 */

import * as validator from 'class-validator'
import {
  createValidator,
  createMessage,
  type ExtendedValidationOptions,
} from './helpers/create-validator.helper'
import { ValidationMessageEnum } from './constants/messages.constants'

// Export types and utilities
export type { ExtendedValidationOptions } from './helpers/create-validator.helper'
export { FIELD_NAMES, getFieldName } from './constants/field-names.constants'
export { ValidationMessageEnum } from './constants/messages.constants'
export * from './transformers'

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const IsDefined = createValidator(
  validator.IsDefined,
  ValidationMessageEnum.IS_DEFINED,
)

export const IsOptional = createValidator(
  validator.IsOptional,
  ValidationMessageEnum.IS_OPTIONAL,
)

export const Equals = createValidator(
  validator.Equals,
  ValidationMessageEnum.EQUALS,
)

export const NotEquals = createValidator(
  validator.NotEquals,
  ValidationMessageEnum.NOT_EQUALS,
)

export const IsEmpty = createValidator(
  validator.IsEmpty,
  ValidationMessageEnum.IS_EMPTY,
)

export const IsNotEmpty = createValidator(
  validator.IsNotEmpty,
  ValidationMessageEnum.IS_NOT_EMPTY,
)

export const IsIn = createValidator(validator.IsIn, ValidationMessageEnum.IS_IN)

export const IsNotIn = createValidator(
  validator.IsNotIn,
  ValidationMessageEnum.IS_NOT_IN,
)

// ============================================================================
// TYPE VALIDATORS
// ============================================================================

export const IsBoolean = createValidator(
  validator.IsBoolean,
  ValidationMessageEnum.IS_BOOLEAN,
)

export const IsDate = createValidator(
  validator.IsDate,
  ValidationMessageEnum.IS_DATE,
)

export const IsString = createValidator(
  validator.IsString,
  ValidationMessageEnum.IS_STRING,
)

export const IsNumber = createValidator(
  validator.IsNumber,
  ValidationMessageEnum.IS_NUMBER,
)

export const IsInt = createValidator(
  validator.IsInt,
  ValidationMessageEnum.IS_INT,
)

export const IsArray = createValidator(
  validator.IsArray,
  ValidationMessageEnum.IS_ARRAY,
)

export const IsEnum = createValidator(
  validator.IsEnum,
  ValidationMessageEnum.IS_ENUM,
)

// ============================================================================
// NUMBER VALIDATORS
// ============================================================================

export const IsDivisibleBy = createValidator(
  validator.IsDivisibleBy,
  ValidationMessageEnum.IS_DIVISIBLE_BY,
)

export const IsPositive = createValidator(
  validator.IsPositive,
  ValidationMessageEnum.IS_POSITIVE,
)

export const IsNegative = createValidator(
  validator.IsNegative,
  ValidationMessageEnum.IS_NEGATIVE,
)

export const Min = createValidator(validator.Min, ValidationMessageEnum.MIN)

export const Max = createValidator(validator.Max, ValidationMessageEnum.MAX)

// ============================================================================
// DATE VALIDATORS
// ============================================================================

export const MinDate = createValidator(
  validator.MinDate,
  ValidationMessageEnum.MIN_DATE,
)

export const MaxDate = createValidator(
  validator.MaxDate,
  ValidationMessageEnum.MAX_DATE,
)

// ============================================================================
// STRING-TYPE VALIDATORS
// ============================================================================

export const IsBooleanString = createValidator(
  validator.IsBooleanString,
  ValidationMessageEnum.IS_BOOLEAN_STRING,
)

export const IsDateString = createValidator(
  validator.IsDateString,
  ValidationMessageEnum.IS_DATE_STRING,
)

export const IsNumberString = createValidator(
  validator.IsNumberString,
  ValidationMessageEnum.IS_NUMBER_STRING,
)

// ============================================================================
// STRING VALIDATORS
// ============================================================================

export const Contains = createValidator(
  validator.Contains,
  ValidationMessageEnum.CONTAINS,
)

export const NotContains = createValidator(
  validator.NotContains,
  ValidationMessageEnum.NOT_CONTAINS,
)

export const IsAlpha = createValidator(
  validator.IsAlpha,
  ValidationMessageEnum.IS_ALPHA,
)

export const IsAlphanumeric = createValidator(
  validator.IsAlphanumeric,
  ValidationMessageEnum.IS_ALPHA_NUMERIC,
)

export const IsDecimal = createValidator(
  validator.IsDecimal,
  ValidationMessageEnum.IS_DECIMAL,
)

export const IsAscii = createValidator(
  validator.IsAscii,
  ValidationMessageEnum.IS_ASCII,
)

export const IsBase32 = createValidator(
  validator.IsBase32,
  ValidationMessageEnum.IS_BASE32,
)

export const IsBase64 = createValidator(
  validator.IsBase64,
  ValidationMessageEnum.IS_BASE64,
)

export const IsCreditCard = createValidator(
  validator.IsCreditCard,
  ValidationMessageEnum.IS_CREDIT_CARD,
)

export const IsCurrency = createValidator(
  validator.IsCurrency,
  ValidationMessageEnum.IS_CURRENCY,
)

export const IsDataURI = createValidator(
  validator.IsDataURI,
  ValidationMessageEnum.IS_DATA_URI,
)

// IsEmail tiene sobrecarga de funciones, necesita wrapper especial
export function IsEmail(
  validationOptions?: ExtendedValidationOptions,
): PropertyDecorator
export function IsEmail(
  options?: Record<string, unknown>,
  validationOptions?: ExtendedValidationOptions,
): PropertyDecorator
export function IsEmail(
  optionsOrValidation?: Record<string, unknown> | ExtendedValidationOptions,
  validationOptions?: ExtendedValidationOptions,
): PropertyDecorator {
  // Determinar si el primer argumento es options o validationOptions
  let options: Record<string, unknown> | undefined
  let finalValidationOptions: ExtendedValidationOptions

  if (validationOptions) {
    // Dos argumentos: options + validationOptions
    options = optionsOrValidation as Record<string, unknown>
    finalValidationOptions = validationOptions
  } else if (
    optionsOrValidation &&
    ('fieldName' in optionsOrValidation ||
      'message' in optionsOrValidation ||
      'groups' in optionsOrValidation ||
      'always' in optionsOrValidation ||
      'each' in optionsOrValidation)
  ) {
    // Un argumento: solo validationOptions
    options = undefined
    finalValidationOptions = optionsOrValidation as ExtendedValidationOptions
  } else {
    // Un argumento: solo options de email
    options = optionsOrValidation as Record<string, unknown> | undefined
    finalValidationOptions = {}
  }

  const { fieldName, ...restOptions } = finalValidationOptions

  const finalOptions: validator.ValidationOptions = {
    ...restOptions,
    message:
      restOptions.message || createMessage(ValidationMessageEnum.IS_EMAIL, fieldName),
  }

  return validator.IsEmail(options, finalOptions)
}

export const IsFullWidth = createValidator(
  validator.IsFullWidth,
  ValidationMessageEnum.IS_FULL_WIDTH,
)

export const IsHalfWidth = createValidator(
  validator.IsHalfWidth,
  ValidationMessageEnum.IS_HALF_WIDTH,
)

export const IsVariableWidth = createValidator(
  validator.IsVariableWidth,
  ValidationMessageEnum.IS_VARIABLE_WIDTH,
)

export const IsHexColor = createValidator(
  validator.IsHexColor,
  ValidationMessageEnum.IS_HEX_COLOR,
)

export const IsRgbColor = createValidator(
  validator.IsRgbColor,
  ValidationMessageEnum.IS_RGB_COLOR,
)

export const IsIdentityCard = createValidator(
  validator.IsIdentityCard,
  ValidationMessageEnum.IS_IDENTITY_CARD,
)

export const IsHexadecimal = createValidator(
  validator.IsHexadecimal,
  ValidationMessageEnum.IS_HEXADECIMAL,
)

export const IsIP = createValidator(validator.IsIP, ValidationMessageEnum.IS_IP)

export const IsPort = createValidator(
  validator.IsPort,
  ValidationMessageEnum.IS_PORT,
)

export const IsJSON = createValidator(
  validator.IsJSON,
  ValidationMessageEnum.IS_JSON,
)

export const IsJWT = createValidator(
  validator.IsJWT,
  ValidationMessageEnum.IS_JWT,
)

export const IsObject = createValidator(
  validator.IsObject,
  ValidationMessageEnum.IS_OBJECT,
)

export const IsNotEmptyObject = createValidator(
  validator.IsNotEmptyObject,
  ValidationMessageEnum.IS_NOT_EMPTY_OBJECT,
)

export const IsLowercase = createValidator(
  validator.IsLowercase,
  ValidationMessageEnum.IS_LOWERCASE,
)

export const IsUppercase = createValidator(
  validator.IsUppercase,
  ValidationMessageEnum.IS_UPPERCASE,
)

export const IsLatLong = createValidator(
  validator.IsLatLong,
  ValidationMessageEnum.IS_LAT_LONG,
)

export const IsLatitude = createValidator(
  validator.IsLatitude,
  ValidationMessageEnum.IS_LATITUDE,
)

export const IsLongitude = createValidator(
  validator.IsLongitude,
  ValidationMessageEnum.IS_LONGITUDE,
)

export const IsUrl = createValidator(
  validator.IsUrl,
  ValidationMessageEnum.IS_URL,
)

export const IsUUID = createValidator(
  validator.IsUUID,
  ValidationMessageEnum.IS_UUID,
)

export const Length = createValidator(
  validator.Length,
  ValidationMessageEnum.LENGTH,
)

export const MinLength = createValidator(
  validator.MinLength,
  ValidationMessageEnum.MIN_LENGTH,
)

export const MaxLength = createValidator(
  validator.MaxLength,
  ValidationMessageEnum.MAX_LENGTH,
)

export const Matches = createValidator(
  validator.Matches,
  ValidationMessageEnum.MATCHES,
)

export const IsMilitaryTime = createValidator(
  validator.IsMilitaryTime,
  ValidationMessageEnum.IS_MILITARY_TIME,
)

export const IsHash = createValidator(
  validator.IsHash,
  ValidationMessageEnum.IS_HASH,
)

export const IsMimeType = createValidator(
  validator.IsMimeType,
  ValidationMessageEnum.IS_MIME_TYPE,
)

// ============================================================================
// ARRAY VALIDATORS
// ============================================================================

export const ArrayContains = createValidator(
  validator.ArrayContains,
  ValidationMessageEnum.ARRAY_CONTAINS,
)

export const ArrayNotContains = createValidator(
  validator.ArrayNotContains,
  ValidationMessageEnum.ARRAY_NOT_CONTAINS,
)

export const ArrayNotEmpty = createValidator(
  validator.ArrayNotEmpty,
  ValidationMessageEnum.ARRAY_NOT_EMPTY,
)

export const ArrayMinSize = createValidator(
  validator.ArrayMinSize,
  ValidationMessageEnum.ARRAY_MIN_SIZE,
)

export const ArrayMaxSize = createValidator(
  validator.ArrayMaxSize,
  ValidationMessageEnum.ARRAY_MAX_SIZE,
)

export const ArrayUnique = createValidator(
  validator.ArrayUnique,
  ValidationMessageEnum.ARRAY_UNIQUE,
)

// ============================================================================
// OBJECT VALIDATORS
// ============================================================================

export const IsInstance = createValidator(
  validator.IsInstance,
  ValidationMessageEnum.IS_INSTANCE,
)

// ============================================================================
// CONDITIONAL VALIDATORS
// ============================================================================

export const ValidateIf = validator.ValidateIf
export const ValidateNested = validator.ValidateNested
