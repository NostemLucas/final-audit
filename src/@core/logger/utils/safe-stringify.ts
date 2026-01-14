/**
 * Convierte un objeto a JSON de forma segura, manejando referencias circulares
 * @param obj - El objeto a convertir
 * @param indent - Espacios de indentación (default: 2)
 * @returns JSON string sin referencias circulares
 */
export function safeStringify(obj: unknown, indent = 2): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj)
  }

  const seen = new WeakSet<object>()

  try {
    return JSON.stringify(
      obj,
      (_key, value: unknown) => {
        // Si el valor es un objeto
        if (typeof value === 'object' && value !== null) {
          // Si ya lo hemos visto, es una referencia circular
          if (seen.has(value)) {
            return '[Circular Reference]'
          }
          // Agregarlo al set de objetos vistos
          seen.add(value)
        }

        return value
      },
      indent,
    )
  } catch (error) {
    // Fallback en caso de error inesperado
    return `[Unable to stringify: ${error instanceof Error ? error.message : 'Unknown error'}]`
  }
}

/**
 * Formatea JSON de manera compacta y legible para logs
 * @param obj - El objeto a formatear
 * @param indent - Espacios de indentación (default: 2)
 * @returns JSON formateado con indentación visual
 */
export function formatJSON(obj: unknown, indent = 2): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj)
  }

  const json = safeStringify(obj, indent)
  return json
    .split('\n')
    .map((line, index) => (index === 0 ? line : ' '.repeat(indent) + line))
    .join('\n')
}
