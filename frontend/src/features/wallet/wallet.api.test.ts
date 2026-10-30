import { describe, expect, it, vi } from 'vitest'
import { http } from '@/shared/api/http'
import { ApiError } from '@/shared/api/errors'
import { walletApi } from './wallet.api'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

const CHECKOUT = {
  pagoId: 'pago-1',
  checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
  expiraEn: '2026-10-28T18:30:00.000Z',
}

describe('walletApi.crearCheckout', () => {
  it('envía el monto con Idempotency-Key a payments/checkout', async () => {
    vi.mocked(http).mockResolvedValue(CHECKOUT)

    await expect(walletApi.crearCheckout(50.5)).resolves.toEqual(CHECKOUT)

    const [ruta, opciones] = vi.mocked(http).mock.calls[0]
    expect(ruta).toBe('payments/checkout')
    expect(opciones).toMatchObject({ method: 'POST', body: { monto: 50.5 } })
    expect(opciones?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rechaza una URL de checkout con un host distinto', async () => {
    vi.mocked(http).mockResolvedValue({ ...CHECKOUT, checkoutUrl: 'https://ejemplo-malicioso.test/pago' })

    await expect(walletApi.crearCheckout(50)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Respuesta de pago no válida. No se abrió ninguna pasarela.',
    })
    await expect(walletApi.crearCheckout(50)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('walletApi.verPago', () => {
  it('consulta el pago propio y codifica el identificador', async () => {
    vi.mocked(http).mockResolvedValue({
      pagoId: 'pago-1', estado: 'PENDIENTE', monto: 50, moneda: 'bob',
      creadoEn: '2026-10-28T18:00:00.000Z', pagadoEn: null,
    })

    await walletApi.verPago('a/b')
    expect(http).toHaveBeenLastCalledWith('payments/a%2Fb')

    await walletApi.sincronizarPago('pago-1')
    expect(http).toHaveBeenLastCalledWith('payments/pago-1/sync', { method: 'POST' })
  })
})
