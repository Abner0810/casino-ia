// Cliente HTTP centralizado.
//
// Responsabilidades (planfrontend.md §3 y §7):
//  - Bearer token en solicitudes protegidas.
//  - Refresh COORDINADO: ante varios 401 simultáneos solo se renueva UNA vez
//    (single-flight) y cada solicitud reintenta una única vez. Login/refresh/
//    register/logout quedan fuera del bucle.
//  - Un 401 del backend llega del middleware de autenticación, que corre ANTES
//    de la lógica de negocio: reintentar la misma petición tras renovar no
//    duplica la operación.
//  - Las mutaciones NUNCA se reintentan automáticamente ante timeout/red/5xx
//    (el resultado pudo confirmarse en el servidor).
//  - Timeout de 20s por solicitud y cancelación agrupada (logout).

import { env } from '@/config/env'
import { ApiError, normalizarError } from './errors'

export type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type OpcionesHttp = {
  method?: Metodo
  body?: unknown
  /** Agrega Authorization Bearer (por defecto true) */
  auth?: boolean
  /** Señal de cancelación (TanStack Query la envía al cancelar/desmontar) */
  signal?: AbortSignal
  query?: Record<string, string | number | boolean | undefined | null>
}

const TIMEOUT_MS = 20_000

// Rutas que jamás disparan refresh (evita bucles)
const EXENTAS_DE_REFRESH = new Set(['auth/login', 'auth/register', 'auth/refresh', 'auth/logout'])

// ── Inyección desde el módulo de sesión (rompe el ciclo de imports) ──
let obtenerAccessToken: () => string | null = () => null
let refrescarSesion: (() => Promise<void>) | null = null
let alPerderSesion: (() => void) | null = null

export function registrarAccesoATokens(fn: () => string | null): void {
  obtenerAccessToken = fn
}

export function configurarSesionHttp(opciones: {
  refrescar: () => Promise<void>
  alPerderSesion: () => void
}): void {
  refrescarSesion = opciones.refrescar
  alPerderSesion = opciones.alPerderSesion
}

// ── Cancelación agrupada (logout): aborta todo lo pendiente ──
const controladores = new Set<AbortController>()

export function abortarPendientes(): void {
  for (const c of controladores) c.abort(new DOMException('Sesión finalizada', 'AbortError'))
  controladores.clear()
}

function construirUrl(ruta: string, query?: OpcionesHttp['query']): URL {
  const limpia = ruta.replace(/^\/+/, '')
  const url = new URL(`${env.apiUrl}/${limpia}`)
  if (query) {
    for (const [clave, valor] of Object.entries(query)) {
      if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, String(valor))
    }
  }
  return url
}

async function pedir(url: URL, init: RequestInit, externa: AbortSignal | undefined): Promise<Response> {
  const controlador = new AbortController()
  controladores.add(controlador)
  let expiro = false
  const reloj = setTimeout(() => {
    expiro = true
    controlador.abort(new DOMException('timeout', 'TimeoutError'))
  }, TIMEOUT_MS)

  const alCancelarExterna = () => controlador.abort(externa?.reason)
  if (externa) {
    if (externa.aborted) controlador.abort(externa.reason)
    else externa.addEventListener('abort', alCancelarExterna, { once: true })
  }

  try {
    return await fetch(url, { ...init, signal: controlador.signal })
  } catch (error) {
    const abortado = (error as Error)?.name === 'AbortError'
    if (abortado && expiro) {
      throw new ApiError({
        status: 0,
        mensaje: 'La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo.',
        esRed: true,
      })
    }
    if (abortado) throw error // cancelación externa: la propaga sin tocar (React Query la maneja)
    throw new ApiError({
      status: 0,
      mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      esRed: true,
    })
  } finally {
    clearTimeout(reloj)
    controladores.delete(controlador)
    externa?.removeEventListener('abort', alCancelarExterna)
  }
}

// Single-flight: todos los 401 concurrentes comparten la MISMA renovación.
let refreshEnCurso: Promise<void> | null = null

function renovarUnaVez(): Promise<void> {
  if (!refrescarSesion) return Promise.reject(new ApiError({ status: 401, mensaje: 'Sesión no válida.' }))
  refreshEnCurso ??= refrescarSesion().finally(() => {
    refreshEnCurso = null
  })
  return refreshEnCurso
}

export async function http<T>(ruta: string, opciones: OpcionesHttp = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, query } = opciones
  const url = construirUrl(ruta, query)
  const rutaLimpia = ruta.replace(/^\/+/, '')

  const encabezados: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) encabezados['Content-Type'] = 'application/json'
  if (auth) {
    const token = obtenerAccessToken()
    if (token) encabezados.Authorization = `Bearer ${token}`
  }

  const init: RequestInit = {
    method,
    headers: encabezados,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  let respuesta = await pedir(url, init, signal)

  if (respuesta.status === 401 && auth && !EXENTAS_DE_REFRESH.has(rutaLimpia)) {
    try {
      await renovarUnaVez()
    } catch {
      alPerderSesion?.()
      throw new ApiError({ status: 401, mensaje: 'Tu sesión expiró. Inicia sesión de nuevo.' })
    }
    // Un único reintento tras la renovación confirmada
    respuesta = await pedir(url, { ...init, headers: { ...encabezados, Authorization: `Bearer ${obtenerAccessToken() ?? ''}` } }, signal)
  }

  if (!respuesta.ok) {
    let payload: unknown = null
    try {
      payload = await respuesta.json()
    } catch {
      /* respuesta sin cuerpo JSON legible */
    }
    const retryAfter = Number(respuesta.headers.get('Retry-After'))
    throw normalizarError(payload, respuesta.status, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined)
  }

  if (respuesta.status === 204) return undefined as T
  try {
    return (await respuesta.json()) as T
  } catch {
    throw new ApiError({
      status: respuesta.status,
      mensaje: 'El servidor devolvió una respuesta ilegible. Inténtalo de nuevo.',
      esRed: true,
    })
  }
}
