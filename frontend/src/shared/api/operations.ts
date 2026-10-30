import { ApiError } from './errors'
import { http } from './http'

export async function ejecutarOperacion<T>(ruta: string, body: unknown, key?: string): Promise<T> {
  const operationKey = key ?? crypto.randomUUID()
  try {
    return await http<T>(ruta, { method: 'POST', body, idempotencyKey: operationKey })
  } catch (error) {
    if (error instanceof ApiError) error.operationKey = operationKey
    throw error
  }
}

export type OperacionPendiente<T = unknown> = { id: string; estado: 'PENDIENTE'; status: 202; response: T }
export type OperacionConfirmada<T> = { id: string; estado: 'CONFIRMADA'; status: number; response: T }
export type OperacionFallida<T = unknown> = { id: string; estado: 'FALLIDA'; status: number; response: T }
export type Operacion<T = unknown> = OperacionPendiente<T> | OperacionConfirmada<T> | OperacionFallida<T>

export const consultarOperacion = <T>(key: string) => http<Operacion<T>>(`operations/${encodeURIComponent(key)}`)
