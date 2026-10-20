import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { http } from './http'
import { consultarOperacion, ejecutarOperacion } from './operations'

vi.mock('./http', () => ({ http: vi.fn() }))

describe('reconciliación sin duplicar una mutación', () => {
  beforeEach(() => { vi.mocked(http).mockReset() })
  it('conserva la clave exacta del POST fallido y consulta solo esa operación', async () => {
    const timeout = new ApiError({ status: 0, mensaje: 'Timeout', esRed: true })
    vi.mocked(http).mockRejectedValueOnce(timeout)
    await expect(ejecutarOperacion('transactions/deposit', { monto: 10, metodo: 'simulado' })).rejects.toBe(timeout)
    const key = vi.mocked(http).mock.calls[0][1]?.idempotencyKey
    expect(timeout.operationKey).toBe(key)
    vi.mocked(http).mockResolvedValueOnce({ estado: 'CONFIRMADA', response: { saldoActual: 110 } })
    await consultarOperacion(timeout.operationKey!)
    expect(http).toHaveBeenLastCalledWith(`operations/${key}`)
    expect(http).toHaveBeenCalledTimes(2)
  })
  it('no interpreta un 404 de reconciliación como operación rechazada', async () => {
    const pendiente = new ApiError({ status: 404, mensaje: 'Operación no encontrada' })
    vi.mocked(http).mockRejectedValue(pendiente)
    await expect(consultarOperacion('pending-operation')).rejects.toBe(pendiente)
  })
})
