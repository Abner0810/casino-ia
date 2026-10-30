import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoSesion } from '@/features/auth/session.context'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { BilleteraPage } from './BilleteraPage'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

const asignar = vi.fn()

const SALDO = { saldo: 100, bono: 0, totalDisponible: 100, actualizadoEn: '2026-10-19T00:00:00Z' }
const BALANCE = {
  saldo: 100,
  bono: 0,
  total: 100,
  historial: {
    totalApostado: 0, totalGanado: 0, cantidadApuestas: 0, cantidadPremios: 0,
    totalDepositado: 100, totalRetirado: 0, resultadoNeto: 0,
  },
}

beforeEach(() => {
  vi.mocked(http).mockReset()
  asignar.mockReset()
  // jsdom no implementa la navegación: se intercepta para comprobar la salida.
  Object.defineProperty(window, 'location', { configurable: true, value: { assign: asignar } })
})

function renderizarBilletera() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <ContextoSesion.Provider
        value={{
          usuario: { publicId: 'qa-user', nombre: 'QA', email: 'qa@example.com', rol: 'USER' },
          autenticado: true,
          iniciar: vi.fn(),
          cerrar: vi.fn(async () => {}),
        }}
      >
        <BilleteraPage />
      </ContextoSesion.Provider>
    </QueryClientProvider>,
  )
}

describe('recarga con Stripe', () => {
  it('no llama a la pasarela si el monto es menor al mínimo de 5 Bs', async () => {
    const user = userEvent.setup()
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return SALDO
      if (ruta === 'wallet/balance') return BALANCE
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarBilletera()

    await user.type(await screen.findByLabelText(/Monto a recargar/), '4.99')
    await user.click(screen.getByRole('button', { name: 'Pagar con Stripe' }))

    expect(await screen.findByText(/El monto mínimo es Bs 5,00/)).toBeVisible()
    expect(vi.mocked(http).mock.calls.some(([ruta]) => ruta === 'payments/checkout')).toBe(false)
    expect(asignar).not.toHaveBeenCalled()
  })

  it('crea la sesión y redirige al checkout alojado de Stripe', async () => {
    const user = userEvent.setup()
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return SALDO
      if (ruta === 'wallet/balance') return BALANCE
      if (ruta === 'payments/checkout') {
        return { pagoId: 'pago-1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1', expiraEn: '2026-10-28T18:30:00.000Z' }
      }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarBilletera()

    await user.type(await screen.findByLabelText(/Monto a recargar/), '50.50')
    await user.click(screen.getByRole('button', { name: 'Pagar con Stripe' }))

    await waitFor(() => expect(asignar).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1'))
    const llamada = vi.mocked(http).mock.calls.find(([ruta]) => ruta === 'payments/checkout')
    expect(llamada?.[1]).toMatchObject({ method: 'POST', body: { monto: 50.5 } })
    expect(llamada?.[1]?.idempotencyKey).toBeTruthy()
  })

  it('muestra el error del servidor sin abrir el checkout', async () => {
    const user = userEvent.setup()
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return SALDO
      if (ruta === 'wallet/balance') return BALANCE
      if (ruta === 'payments/checkout') throw new ApiError({ status: 503, mensaje: 'Los pagos no están configurados en este entorno' })
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarBilletera()

    await user.type(await screen.findByLabelText(/Monto a recargar/), '50')
    await user.click(screen.getByRole('button', { name: 'Pagar con Stripe' }))

    expect(await screen.findByText('Los pagos no están configurados en este entorno')).toBeVisible()
    expect(asignar).not.toHaveBeenCalled()
  })
})

describe('límite de retiro', () => {
  it('bloquea importes superiores a 500 y permite confirmar el límite exacto', async () => {
    const user = userEvent.setup()
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return { ...SALDO, saldo: 1000, totalDisponible: 1000 }
      if (ruta === 'wallet/balance') return { ...BALANCE, saldo: 1000, total: 1000 }
      if (ruta === 'transactions/withdraw') return { mensaje: 'Retiro completado', saldoActual: 500 }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarBilletera()
    const monto = await screen.findByLabelText('Monto a retirar (máx. Bs 500,00)')
    await user.type(monto, '500.01')
    await user.click(screen.getByRole('button', { name: 'Continuar con el retiro' }))
    expect(await screen.findByText('El monto máximo por retiro es Bs 500,00')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(http).mock.calls.some(([ruta]) => ruta === 'transactions/withdraw')).toBe(false)

    await user.clear(monto)
    await user.type(monto, '500')
    await user.click(screen.getByRole('button', { name: 'Continuar con el retiro' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    await waitFor(() => expect(vi.mocked(http).mock.calls.find(([ruta]) => ruta === 'transactions/withdraw')?.[1]?.body).toEqual({ monto: 500, metodo: 'simulado' }))
  })
})

describe('retiro con resultado incierto', () => {
  it('bloquea ambos formularios y conserva el bloqueo ante 404 hasta confirmar la operación exacta', async () => {
    const user = userEvent.setup()
    let consultas = 0
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return SALDO
      if (ruta === 'wallet/balance') return BALANCE
      if (ruta === 'transactions/withdraw') throw new ApiError({ status: 0, mensaje: 'Timeout', esRed: true })
      if (ruta.startsWith('operations/')) {
        consultas++
        if (consultas === 1) throw new ApiError({ status: 404, mensaje: 'Operación no encontrada' })
        return { id: 'operation-1', estado: 'CONFIRMADA', status: 200, response: { mensaje: 'Retiro confirmado', saldoActual: 90 } }
      }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarBilletera()

    await user.type(await screen.findByLabelText(/Monto a retirar/), '10')
    await user.click(screen.getByRole('button', { name: 'Continuar con el retiro' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))

    expect(await screen.findByText('Resultado incierto')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pagar con Stripe' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continuar con el retiro' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Reconsultar saldo' }))
    expect(await screen.findByText(/todavía no puede confirmarse/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pagar con Stripe' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Reconsultar saldo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pagar con Stripe' })).toBeEnabled())

    expect(vi.mocked(http).mock.calls.filter(([ruta]) => ruta === 'transactions/withdraw')).toHaveLength(1)
    const clave = vi.mocked(http).mock.calls.find(([ruta]) => ruta === 'transactions/withdraw')![1]!.idempotencyKey
    expect(vi.mocked(http).mock.calls.filter(([ruta]) => ruta === `operations/${clave}`)).toHaveLength(2)
  })
})
