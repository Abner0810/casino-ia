import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoSesion } from '@/features/auth/session.context'
import { http } from '@/shared/api/http'
import type { Pago } from '../wallet.api'
import { RetornoPagoPage } from './RetornoPagoPage'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

const PENDIENTE: Pago = {
  pagoId: 'pago-1',
  estado: 'PENDIENTE',
  monto: 50,
  moneda: 'bob',
  creadoEn: '2026-10-28T18:00:00.000Z',
  pagadoEn: null,
}

beforeEach(() => {
  vi.mocked(http).mockReset()
})

function renderizarRetorno(ruta = '/billetera/retorno?pago=pago-1') {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
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
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/billetera/retorno" element={<RetornoPagoPage />} />
            <Route path="/billetera" element={<p>Billetera</p>} />
          </Routes>
        </MemoryRouter>
      </ContextoSesion.Provider>
    </QueryClientProvider>,
  )
}

describe('retorno del pago de Stripe', () => {
  it('explica que falta el identificador sin consultar la API', () => {
    renderizarRetorno('/billetera/retorno')

    expect(screen.getByRole('heading', { name: 'No encontramos el pago' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Volver a la billetera' })).toBeVisible()
    expect(http).not.toHaveBeenCalled()
  })

  it('muestra el pago pendiente y permite forzar la conciliación', async () => {
    const user = userEvent.setup()
    let pago: Pago = { ...PENDIENTE }
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'payments/pago-1') return pago
      if (ruta === 'payments/pago-1/sync') {
        pago = { ...pago, estado: 'PAGADO', pagadoEn: '2026-10-28T18:01:00.000Z' }
        return pago
      }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    renderizarRetorno()

    expect(await screen.findByRole('heading', { name: 'Pago en proceso' })).toBeVisible()
    expect(screen.getByText(/Stripe aún no confirma el pago/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Comprobar de nuevo' }))

    expect(await screen.findByRole('heading', { name: 'Recarga confirmada' })).toBeVisible()
    expect(screen.getByText(/Se acreditaron Bs 50,00/)).toBeVisible()
    expect(vi.mocked(http).mock.calls.some(([ruta]) => ruta === 'payments/pago-1/sync')).toBe(true)
  })

  it('informa el pago confirmado con el monto formateado en bolivianos', async () => {
    vi.mocked(http).mockResolvedValue({
      ...PENDIENTE,
      estado: 'PAGADO',
      pagadoEn: '2026-10-28T18:01:00.000Z',
    })
    renderizarRetorno()

    expect(await screen.findByRole('heading', { name: 'Recarga confirmada' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Se acreditaron Bs 50,00 a tu saldo de simulación.')
    expect(screen.queryByRole('button', { name: 'Comprobar de nuevo' })).not.toBeInTheDocument()
  })

  it('no promete cobro cuando el pago expiró', async () => {
    vi.mocked(http).mockResolvedValue({ ...PENDIENTE, estado: 'EXPIRADO' })
    renderizarRetorno()

    expect(await screen.findByRole('heading', { name: 'El pago no se completó' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('No se acreditó saldo y no se te cobró nada.')
  })

  it('permite reintentar la consulta tras un error de red', async () => {
    const user = userEvent.setup()
    let consultas = 0
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta !== 'payments/pago-1') throw new Error(`Petición inesperada: ${ruta}`)
      consultas += 1
      if (consultas === 1) throw new Error('Sin conexión')
      return { ...PENDIENTE, estado: 'PAGADO', pagadoEn: '2026-10-28T18:01:00.000Z' }
    })
    renderizarRetorno()

    expect(await screen.findByRole('heading', { name: 'No pudimos confirmar el pago' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Recarga confirmada' })).toBeVisible(),
    )
  })
})
