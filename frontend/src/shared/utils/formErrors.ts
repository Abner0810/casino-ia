import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/shared/api/errors'

/**
 * Traslada los errores por campo del backend (detalles: [{campo, mensaje}])
 * a react-hook-form. Devuelve true si hubo errores de campo que mapear.
 */
export function aplicarErroresDeApi<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ApiError) || error.detalles.length === 0) return false
  let aplicados = 0
  for (const detalle of error.detalles) {
    if (!detalle.campo) continue
    setError(detalle.campo as Path<T>, { type: 'server', message: detalle.mensaje })
    aplicados++
  }
  return aplicados > 0
}
