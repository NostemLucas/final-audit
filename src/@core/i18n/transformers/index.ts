import { Transform } from 'class-transformer'

/**
 * Custom Transformers for DTOs
 *
 * Transformadores personalizados para convertir valores de entrada
 * a los tipos esperados antes de la validación.
 */

/**
 * Transforma una fecha a UTC
 */
export function ToUtcDate(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (!value) return value as Date | null | undefined

    try {
      let date: Date

      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value)
      } else {
        return value as Date
      }

      if (isNaN(date.getTime())) {
        return value as Date
      }

      return new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds(),
        ),
      )
    } catch {
      return value as Date
    }
  })
}

/**
 * Transforma una fecha a string ISO UTC
 */
export function ToUtcDateString(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (!value) return value as string | null | undefined

    try {
      let date: Date

      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value)
      } else {
        return value as string
      }

      if (isNaN(date.getTime())) {
        return value as string
      }

      return date.toISOString()
    } catch {
      return value as string
    }
  })
}

/**
 * Transforma strings a minúsculas
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.toLowerCase()
    }
    return value as string
  })
}

/**
 * Transforma strings a mayúsculas
 */
export function ToUpperCase(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.toUpperCase()
    }
    return value as string
  })
}

/**
 * Elimina espacios en blanco al inicio y final
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim()
    }
    return value as string
  })
}

/**
 * Convierte a número si es posible
 */
export function ToNumber(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') {
      return value as number | null | undefined | string
    }

    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return value as unknown as number

      const num = Number(trimmed)
      return isNaN(num) ? (value as unknown as number) : num
    }

    const num = Number(value)
    return isNaN(num) ? (value as unknown as number) : num
  })
}

/**
 * Convierte a boolean de manera inteligente
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') return value

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      if (['true', '1', 'yes', 'on', 'y', 'si', 'sí'].includes(lower))
        return true
      if (['false', '0', 'no', 'off', 'n', ''].includes(lower)) return false
      return lower.length > 0
    }

    if (typeof value === 'number') {
      return value !== 0 && !isNaN(value)
    }

    return Boolean(value)
  })
}

/**
 * Convierte a array
 */
export function ToArray(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return value as unknown[]

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return []

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed: unknown = JSON.parse(trimmed)
          return Array.isArray(parsed) ? (parsed as unknown[]) : [value]
        } catch {
          return [value]
        }
      }

      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }

    if (value === null || value === undefined) return []

    return [value] as unknown[]
  })
}

/**
 * Convierte a array de strings
 */
export function ToStringArray(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      return value
    }

    if (Array.isArray(value)) {
      return value
        .map((item: unknown) => {
          if (item === null || item === undefined) return ''
          if (
            typeof item === 'string' ||
            typeof item === 'number' ||
            typeof item === 'boolean'
          ) {
            return String(item).trim()
          }
          return JSON.stringify(item)
        })
        .filter((str) => str.length > 0)
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return []

      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map((item) => item.trim())
          .filter((str) => str.length > 0)
      }

      return [trimmed]
    }

    if (value === undefined || value === null) {
      return []
    }

    // Handle other types (numbers, booleans, objects)
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      const str = String(value).trim()
      return str.length > 0 ? [str] : []
    }

    // For objects, use JSON.stringify
    const str = JSON.stringify(value)
    return str.length > 0 ? [str] : []
  })
}

/**
 * Convierte a array de números
 */
export function ToNumberArray(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'number' && !isNaN(item))
    ) {
      return value as number[]
    }

    if (Array.isArray(value)) {
      return value
        .map((item: unknown) => {
          if (item === null || item === undefined || item === '') return NaN
          return Number(item)
        })
        .filter((num) => !isNaN(num))
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return []

      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((num) => !isNaN(num))
      }

      const num = Number(trimmed)
      return isNaN(num) ? [] : [num]
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return [value]
    }

    if (value === undefined || value === null) {
      return []
    }

    const num = Number(value)
    return isNaN(num) ? [] : [num]
  })
}
