import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/shared/api/http'
import { gamesApi } from './games.api'
import { walletApi } from '@/features/wallet/wallet.api'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

describe('contratos de juegos y billetera', () => {
  beforeEach(() => { vi.mocked(http).mockReset() })
  it('desenvuelve items del historial Plinko', async () => {
    const items = [{ id: 'ronda-1', riesgo: 'PEQUENO' }]
    vi.mocked(http).mockResolvedValue({ items })
    expect(await gamesApi.plinko.rondas()).toBe(items)
  })
  it('solicita multiplicadores al servidor', async () => {
    vi.mocked(http).mockResolvedValue({ filas: 9, slots: 10, riesgos: [] })
    await gamesApi.plinko.configuracion()
    expect(http).toHaveBeenCalledWith('games/plinko/config')
  })
  it('asigna una clave de idempotencia diferente a cada operación nueva', async () => {
    await walletApi.depositar(150.5)
    await walletApi.retirar(20)
    await gamesApi.plinko.apostar(10, 'PEQUENO')
    const llamadas = vi.mocked(http).mock.calls
    expect(llamadas[0][1]).toMatchObject({ method: 'POST', body: { monto: 150.5, metodo: 'simulado' }, idempotencyKey: expect.any(String) })
    expect(new Set(llamadas.map((llamada) => llamada[1]?.idempotencyKey)).size).toBe(3)
  })
})
