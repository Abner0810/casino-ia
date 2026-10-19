import { ApiError } from './errors'
import { http } from './http'

export async function ejecutarOperacion<T>(ruta: string, body: unknown): Promise<T> {
  const key = crypto.randomUUID()
  try {
    return await http<T>(ruta, { method: 'POST', body, idempotencyKey: key })
  } catch (error) {
    if (error instanceof ApiError) error.operationKey = key
    throw error
  }
}

export type OperacionConfirmada<T> = { id: string; estado: 'CONFIRMADA'; status: number; response: T }

export const consultarOperacion = <T>(key: string) => http<OperacionConfirmada<T>>(`operations/${encodeURIComponent(key)}`)
