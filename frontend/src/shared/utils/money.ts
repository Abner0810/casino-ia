// Manejo de importes SIN aritmética monetaria con floats en la UI.
// El servidor es la única fuente de verdad de saldos y liquidaciones;
// aquí solo se valida la entrada textual y se formatea para mostrar.

export const MONTO_MAXIMO = 1_000_000

const RE_MONTO = /^\d+(\.\d{1,2})?$/

/**
 * Valida una entrada textual de monto. Devuelve el mensaje de error o null si es válida.
 * Reglas del backend: positivo, máximo 1.000.000 y máximo 2 decimales.
 */
export function validarMontoTexto(texto: string): string | null {
  const t = texto.trim()
  if (!t) return 'Ingresa un monto'
  if (!RE_MONTO.test(t)) return 'Usa solo números con máximo 2 decimales (ej. 150.50)'
  const valor = Number(t)
  if (!Number.isFinite(valor) || valor <= 0) return 'El monto debe ser mayor a cero'
  if (valor > MONTO_MAXIMO) return `El monto máximo es ${formatearDinero(MONTO_MAXIMO)}`
  return null
}

/** Convierte la entrada textual validada a número para enviar al servidor. */
export function montoATexto(texto: string): number {
  return Number(texto.trim())
}

/** Formatea con dos decimales y separador de miles, SIN asignar moneda. */
export function formatearDinero(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

/** Formatea un multiplicador compacto (ej. 1.5x). */
export function formatearMultiplicador(valor: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor)}x`
}
