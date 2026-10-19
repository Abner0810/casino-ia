import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { gamesApi } from '@/features/games/games.api'
import type { PartidaBlackjack } from '@/features/games/games.api'
import { ApiError } from '@/shared/api/errors'
import { consultarOperacion } from '@/shared/api/operations'
import BlackjackPage from './BlackjackPage'

vi.mock('@/features/auth/session.context', () => ({ useSession: () => ({ usuario: { publicId: 'jugador-1' } }) }))
vi.mock('@/shared/api/operations', () => ({ consultarOperacion: vi.fn() }))
vi.mock('@/features/games/games.api', () => ({ gamesApi: {
  acceso: vi.fn(),
  blackjack: { activa: vi.fn(), consultar: vi.fn(), iniciar: vi.fn(), accion: vi.fn(), rondas: vi.fn() },
} }))

function partida(cambios: Partial<PartidaBlackjack> = {}): PartidaBlackjack {
  return {
    partidaId: 'partida-1', version: 3, indiceManoActiva: 0, estado: 'ACTIVA',
    apuestaBase: 10, apuestaTotal: 10, saldoActual: 90, cartasRestantes: 308,
    dealer: { cartas: ['8♣', '🂠'], totalVisible: 8 },
    manos: [{ cartas: ['J♥', 'K♠'], valor: 20, apuesta: 10, estado: 'ACTIVA', ganancia: null, dividida: false, doblada: false }],
    accionesPermitidas: ['hit', 'stand', 'exit', 'split', 'double'], resultado: null,
    ...cambios,
  }
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><BlackjackPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(gamesApi.acceso).mockResolvedValue({ juego: 'blackjack', saldo: 90, mesa: { apuestaMinima: 1, apuestaMaxima: 500, reglas: [] } })
  vi.mocked(gamesApi.blackjack.activa).mockResolvedValue({ partida: partida() })
  vi.mocked(gamesApi.blackjack.rondas).mockResolvedValue([])
})

it('recupera la partida activa y obedece las acciones permitidas por el servidor', async () => {
  vi.mocked(gamesApi.blackjack.activa).mockResolvedValue({ partida: partida({ accionesPermitidas: ['hit', 'stand', 'exit'] }) })
  montar()
  expect(await screen.findByRole('button', { name: 'Pedir carta' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Dividir par' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Doblar apuesta' })).toBeDisabled()
  expect(screen.getByLabelText('Carta oculta')).toBeVisible()
  expect(gamesApi.blackjack.iniciar).not.toHaveBeenCalled()
})

it('envía una sola acción con la versión actual y bloquea las demás hasta su respuesta', async () => {
  let resolver!: (valor: PartidaBlackjack) => void
  vi.mocked(gamesApi.blackjack.accion).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
  montar()
  const pedir = await screen.findByRole('button', { name: 'Pedir carta' })
  const user = userEvent.setup()
  await user.dblClick(pedir)
  expect(gamesApi.blackjack.accion).toHaveBeenCalledTimes(1)
  expect(gamesApi.blackjack.accion).toHaveBeenCalledWith('partida-1', 'hit', 3)
  expect(screen.getByRole('button', { name: 'Plantarse' })).toBeDisabled()
  resolver(partida({ version: 4 }))
  await waitFor(() => expect(pedir).toBeEnabled())
})

it('requiere confirmar la rendición antes de enviar exit', async () => {
  vi.mocked(gamesApi.blackjack.accion).mockResolvedValue(partida({ estado: 'RENDIDA', accionesPermitidas: [], indiceManoActiva: null, devuelto: 5 }))
  montar()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Rendirse' }))
  const modal = screen.getByRole('dialog')
  expect(gamesApi.blackjack.accion).not.toHaveBeenCalled()
  await user.click(within(modal).getByRole('button', { name: 'Confirmar rendición' }))
  await waitFor(() => expect(gamesApi.blackjack.accion).toHaveBeenCalledWith('partida-1', 'exit', 3))
})

it('mantiene bloqueo ante operación no confirmada y recupera la clave exacta sin repetir POST', async () => {
  const fallo = new ApiError({ status: 0, mensaje: 'Conexión perdida', esRed: true })
  fallo.operationKey = 'operacion-incierta-123'
  vi.mocked(gamesApi.blackjack.accion).mockRejectedValue(fallo)
  vi.mocked(consultarOperacion).mockRejectedValueOnce(new ApiError({ status: 404, mensaje: 'Operación aún no confirmada' }))
  montar()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Pedir carta' }))
  expect(await screen.findByText('La partida necesita verificación')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Pedir carta' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Recuperar mesa' }))
  expect(await screen.findByText('Operación aún no confirmada')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Pedir carta' })).toBeDisabled()
  expect(consultarOperacion).toHaveBeenCalledWith('operacion-incierta-123')
  expect(gamesApi.blackjack.activa).toHaveBeenCalledTimes(1)
  vi.mocked(consultarOperacion).mockResolvedValue({ id: 'operacion-incierta-123', estado: 'CONFIRMADA', status: 200, response: partida({ version: 4 }) })
  vi.mocked(gamesApi.blackjack.consultar).mockResolvedValue(partida({ version: 4 }))
  await user.click(screen.getByRole('button', { name: 'Recuperar mesa' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pedir carta' })).toBeEnabled())
  expect(gamesApi.blackjack.accion).toHaveBeenCalledTimes(1)
  expect(gamesApi.blackjack.consultar).toHaveBeenCalledWith('partida-1')
  expect(consultarOperacion).toHaveBeenCalledTimes(2)
})

it('muestra una apertura resuelta por el servidor sin habilitar acciones de una mano finalizada', async () => {
  vi.mocked(gamesApi.blackjack.activa).mockResolvedValue({ partida: null })
  vi.mocked(gamesApi.blackjack.iniciar).mockResolvedValue(partida({
    estado: 'GANADA', indiceManoActiva: null, accionesPermitidas: [], saldoActual: 115,
    dealer: { cartas: ['8♣', 'K♠'], totalVisible: 18 },
    manos: [{ cartas: ['A♥', 'K♠'], valor: 21, apuesta: 10, estado: 'GANADA', ganancia: 25, doblada: false, dividida: false }],
  }))
  montar()
  const user = userEvent.setup()
  await user.type(await screen.findByRole('textbox', { name: 'Apuesta' }), '10')
  await user.click(screen.getByRole('button', { name: 'Repartir cartas' }))
  expect(await screen.findByRole('button', { name: 'Nueva partida' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Pedir carta' })).not.toBeInTheDocument()
  expect(screen.getByText('Retorno bruto:')).toHaveTextContent('25.00')
  expect(gamesApi.blackjack.iniciar).toHaveBeenCalledWith(10)
})
