// Errores normalizados de la API.
// Contrato del backend (error.handler.js): { error, detalles?: [{campo, mensaje}] }
// También se normalizan fallos de red y respuestas sin JSON.

export type DetalleError = { campo: string; mensaje: string }

export type DatosApiError = {
  status: number
  mensaje: string
  detalles?: DetalleError[]
  esRed?: boolean
  retryAfterSegundos?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly detalles: DetalleError[]
  /** true cuando ni siquiera hubo respuesta HTTP (red, timeout, JSON inválido) */
  readonly esRed: boolean
  readonly retryAfterSegundos?: number

  constructor({ status, mensaje, detalles = [], esRed = false, retryAfterSegundos }: DatosApiError) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.detalles = detalles
    this.esRed = esRed
    this.retryAfterSegundos = retryAfterSegundos
  }

  get esSesion(): boolean {
    return this.status === 401
  }
}

function mensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'La solicitud no es válida. Revisa los datos ingresados.'
    case 401:
      return 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.'
    case 403:
      return 'No tienes permiso para realizar esta acción.'
    case 404:
      return 'El recurso solicitado no está disponible.'
    case 409:
      return 'La operación entra en conflicto con el estado actual.'
    case 429:
      return 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.'
    default:
      if (status >= 500) return 'El servidor tuvo un problema inesperado. Inténtalo de nuevo.'
      return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  }
}

export function normalizarError(payload: unknown, status: number, retryAfterSegundos?: number): ApiError {
  const obj = payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  const mensaje = obj && typeof obj.error === 'string' && obj.error.trim() ? obj.error : mensajePorDefecto(status)

  let detalles: DetalleError[] = []
  if (obj && Array.isArray(obj.detalles)) {
    detalles = obj.detalles
      .filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
      .map((d) => ({
        campo: typeof d.campo === 'string' ? d.campo : '',
        mensaje: typeof d.mensaje === 'string' ? d.mensaje : 'Valor no válido',
      }))
  }

  return new ApiError({ status, mensaje, detalles, retryAfterSegundos })
}
