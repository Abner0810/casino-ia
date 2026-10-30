// Manejo de importes SIN aritmética monetaria con floats en la UI.
// El servidor es la única fuente de verdad de saldos y liquidaciones;
// aquí solo se valida la entrada textual y se formatea para mostrar.

export const MONTO_MAXIMO = 1_000_000
export const RETIRO_MAXIMO = 500

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

/** Valida el retiro simulado: positivo, hasta 500 Bs y máximo 2 decimales. */
export function validarMontoRetiro(texto: string): string | null {
  if (RE_MONTO.test(texto.trim()) && montoATexto(texto) > RETIRO_MAXIMO) return `El monto máximo por retiro es ${formatearBs(RETIRO_MAXIMO)}`
  const error = validarMontoTexto(texto)
  if (error) return error
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

// ── Recargas con Stripe (bolivianos) ──────────────────────────────
// Las recargas de Stripe tienen su propio rango 5–500 Bs.

export const RECARGA_MINIMA = 5
export const RECARGA_MAXIMA = 500

/** Valida el monto de recarga con Stripe: 5–500 Bs, máximo 2 decimales. */
export function validarMontoRecarga(texto: string): string | null {
  const t = texto.trim()
  if (!t) return 'Ingresa un monto'
  if (!RE_MONTO.test(t)) return 'Usa solo números con máximo 2 decimales (ej. 50.50)'
  const valor = Number(t)
  if (!Number.isFinite(valor)) return 'Ingresa un monto válido'
  if (valor < RECARGA_MINIMA) return `El monto mínimo es ${formatearBs(RECARGA_MINIMA)}`
  if (valor > RECARGA_MAXIMA) return `El monto máximo es ${formatearBs(RECARGA_MAXIMA)}`
  return null
}

/** Formatea en bolivianos: Bs 1.234,56 */
export function formatearBs(valor: number): string {
  return `Bs ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)}`
}

/** Formatea un multiplicador compacto (ej. 1.5x). */
export function formatearMultiplicador(valor: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor)}x`
}
