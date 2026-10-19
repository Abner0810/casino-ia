import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContextoSesion } from '@/features/auth/session.context'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'
import { BilleteraPage } from './BilleteraPage'

vi.mock('@/shared/api/http', () => ({ http: vi.fn() }))

describe('billetera con resultado incierto', () => {
  it('bloquea ambos formularios y conserva el bloqueo ante 404 hasta confirmar la operación exacta', async () => {
    const user = userEvent.setup()
    let consultas = 0
    vi.mocked(http).mockImplementation(async (ruta) => {
      if (ruta === 'wallet') return { saldo: 100, bono: 0, totalDisponible: 100, actualizadoEn: '2026-10-19T00:00:00Z' }
      if (ruta === 'wallet/balance') return { saldo: 100, bono: 0, total: 100, historial: { totalApostado: 0, totalGanado: 0, cantidadApuestas: 0, cantidadPremios: 0, totalDepositado: 100, totalRetirado: 0, resultadoNeto: 0 } }
      if (ruta === 'transactions/deposit') throw new ApiError({ status: 0, mensaje: 'Timeout', esRed: true })
      if (ruta.startsWith('operations/')) {
        consultas++
        if (consultas === 1) throw new ApiError({ status: 404, mensaje: 'Operación no encontrada' })
        return { id: 'operation-1', estado: 'CONFIRMADA', status: 201, response: { mensaje: 'Recarga confirmada', saldoActual: 100 } }
      }
      throw new Error(`Petición inesperada: ${ruta}`)
    })
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={cliente}>
        <ContextoSesion.Provider value={{ usuario: { publicId: 'qa-user', nombre: 'QA', email: 'qa@example.com', rol: 'USER' }, autenticado: true, iniciar: vi.fn(), cerrar: vi.fn(async () => {}) }}>
          <BilleteraPage />
        </ContextoSesion.Provider>
      </QueryClientProvider>,
    )
    await user.type(screen.getByLabelText(/Monto a recargar/), '10')
    await user.click(screen.getByRole('button', { name: 'Simular recarga' }))
    expect(await screen.findByText('Resultado incierto')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Simular recarga' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continuar con el retiro' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Reconsultar saldo' }))
    expect(await screen.findByText(/todavía no puede confirmarse/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Simular recarga' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Reconsultar saldo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simular recarga' })).toBeEnabled())
    expect(vi.mocked(http).mock.calls.filter(([ruta]) => ruta === 'transactions/deposit')).toHaveLength(1)
    const clave = vi.mocked(http).mock.calls.find(([ruta]) => ruta === 'transactions/deposit')![1]!.idempotencyKey
    expect(vi.mocked(http).mock.calls.filter(([ruta]) => ruta === `operations/${clave}`)).toHaveLength(2)
  })
})
