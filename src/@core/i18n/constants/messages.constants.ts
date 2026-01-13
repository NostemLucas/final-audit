/**
 * Validation Messages in Spanish
 *
 * Mensajes de validación en español con placeholders:
 * - {{field}} - Nombre del campo (auto-traducido)
 * - {{value}} - Valor actual
 * - {{constraint1}}, {{constraint2}} - Restricciones del validador
 * - {{min}}, {{max}} - Valores mínimo/máximo
 */
export enum ValidationMessageEnum {
  // Mensajes comunes
  IS_DEFINED = 'El campo {{field}} es requerido',
  IS_OPTIONAL = 'El campo {{field}} es opcional',
  EQUALS = 'El campo {{field}} debe ser igual a {{constraint1}}',
  NOT_EQUALS = 'El campo {{field}} no debe ser igual a {{constraint1}}',
  IS_EMPTY = 'El campo {{field}} debe estar vacío',
  IS_NOT_EMPTY = 'El campo {{field}} no debe estar vacío',
  IS_IN = 'El campo {{field}} debe ser uno de los siguientes valores: {{constraint1}}',
  IS_NOT_IN = 'El campo {{field}} no debe ser uno de los siguientes valores: {{constraint1}}',

  // Tipos
  IS_BOOLEAN = 'El campo {{field}} debe ser un valor booleano',
  IS_DATE = 'El campo {{field}} debe ser una fecha válida',
  IS_STRING = 'El campo {{field}} debe ser una cadena de texto',
  IS_NUMBER = 'El campo {{field}} debe ser un número',
  IS_INT = 'El campo {{field}} debe ser un número entero',
  IS_ARRAY = 'El campo {{field}} debe ser un arreglo',
  IS_ENUM = 'El campo {{field}} debe ser un valor válido del enum',

  // Números
  IS_DIVISIBLE_BY = 'El campo {{field}} debe ser divisible por {{constraint1}}',
  IS_POSITIVE = 'El campo {{field}} debe ser un número positivo',
  IS_NEGATIVE = 'El campo {{field}} debe ser un número negativo',
  MIN = 'El campo {{field}} debe ser mayor o igual a {{constraint1}}',
  MAX = 'El campo {{field}} debe ser menor o igual a {{constraint1}}',

  // Fechas
  MIN_DATE = 'El campo {{field}} debe ser una fecha posterior o igual a {{constraint1}}',
  MAX_DATE = 'El campo {{field}} debe ser una fecha anterior o igual a {{constraint1}}',

  // String tipos
  IS_BOOLEAN_STRING = 'El campo {{field}} debe ser una cadena booleana',
  IS_DATE_STRING = 'El campo {{field}} debe ser una cadena de fecha válida',
  IS_NUMBER_STRING = 'El campo {{field}} debe ser una cadena numérica',

  // Strings
  CONTAINS = 'El campo {{field}} debe contener la cadena {{constraint1}}',
  NOT_CONTAINS = 'El campo {{field}} no debe contener la cadena {{constraint1}}',
  IS_ALPHA = 'El campo {{field}} debe contener solo letras',
  IS_ALPHA_NUMERIC = 'El campo {{field}} debe contener solo letras y números',
  IS_DECIMAL = 'El campo {{field}} debe ser un número decimal',
  IS_ASCII = 'El campo {{field}} debe contener solo caracteres ASCII',
  IS_BASE32 = 'El campo {{field}} debe ser una cadena base32 válida',
  IS_BASE64 = 'El campo {{field}} debe ser una cadena base64 válida',
  IS_CREDIT_CARD = 'El campo {{field}} debe ser un número de tarjeta de crédito válido',
  IS_CURRENCY = 'El campo {{field}} debe ser un formato de moneda válido',
  IS_DATA_URI = 'El campo {{field}} debe ser un data URI válido',
  IS_EMAIL = 'El campo {{field}} debe ser una dirección de correo electrónico válida',
  IS_FULL_WIDTH = 'El campo {{field}} debe contener caracteres de ancho completo',
  IS_HALF_WIDTH = 'El campo {{field}} debe contener caracteres de medio ancho',
  IS_VARIABLE_WIDTH = 'El campo {{field}} debe contener caracteres de ancho variable',
  IS_HEX_COLOR = 'El campo {{field}} debe ser un color hexadecimal válido',
  IS_RGB_COLOR = 'El campo {{field}} debe ser un color RGB válido',
  IS_IDENTITY_CARD = 'El campo {{field}} debe ser un número de documento de identidad válido',
  IS_HEXADECIMAL = 'El campo {{field}} debe ser una cadena hexadecimal',
  IS_IP = 'El campo {{field}} debe ser una dirección IP válida',
  IS_PORT = 'El campo {{field}} debe ser un número de puerto válido',
  IS_JSON = 'El campo {{field}} debe ser un JSON válido',
  IS_JWT = 'El campo {{field}} debe ser un JWT válido',
  IS_OBJECT = 'El campo {{field}} debe ser un objeto',
  IS_NOT_EMPTY_OBJECT = 'El campo {{field}} no debe ser un objeto vacío',
  IS_LOWERCASE = 'El campo {{field}} debe estar en minúsculas',
  IS_UPPERCASE = 'El campo {{field}} debe estar en mayúsculas',
  IS_LAT_LONG = 'El campo {{field}} debe ser coordenadas de latitud y longitud válidas',
  IS_LATITUDE = 'El campo {{field}} debe ser una latitud válida',
  IS_LONGITUDE = 'El campo {{field}} debe ser una longitud válida',
  IS_URL = 'El campo {{field}} debe ser una URL válida',
  IS_UUID = 'El campo {{field}} debe ser un UUID válido',
  LENGTH = 'El campo {{field}} debe tener una longitud entre {{constraint1}} y {{constraint2}} caracteres',
  MIN_LENGTH = 'El campo {{field}} debe tener al menos {{constraint1}} caracteres',
  MAX_LENGTH = 'El campo {{field}} debe tener máximo {{constraint1}} caracteres',
  MATCHES = 'El campo {{field}} debe coincidir con el patrón {{constraint1}}',
  IS_MILITARY_TIME = 'El campo {{field}} debe estar en formato de hora militar',
  IS_HASH = 'El campo {{field}} debe ser un hash {{constraint1}} válido',
  IS_MIME_TYPE = 'El campo {{field}} debe ser un tipo MIME válido',

  // Arrays
  ARRAY_CONTAINS = 'El campo {{field}} debe contener el valor {{constraint1}}',
  ARRAY_NOT_CONTAINS = 'El campo {{field}} no debe contener el valor {{constraint1}}',
  ARRAY_NOT_EMPTY = 'El campo {{field}} no debe ser un arreglo vacío',
  ARRAY_MIN_SIZE = 'El campo {{field}} debe tener al menos {{constraint1}} elementos',
  ARRAY_MAX_SIZE = 'El campo {{field}} debe tener máximo {{constraint1}} elementos',
  ARRAY_UNIQUE = 'Todos los elementos en el campo {{field}} deben ser únicos',

  // Objetos
  IS_INSTANCE = 'El campo {{field}} debe ser una instancia de {{constraint1}}',
}
