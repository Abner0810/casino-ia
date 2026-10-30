import { http } from '@/shared/api/http'
import { ApiError } from '@/shared/api/errors'
import { ejecutarOperacion } from '@/shared/api/operations'
const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? 0 : n
  }
  if (v && typeof v === 'object' && 'toNumber' in v) {
    try { return (v as { toNumber: () => number }).toNumber() } catch { return 0 }
  }
  return 0
}

export type Billetera = {
  saldo: number
  bono: number
  totalDisponible: number
  actualizadoEn: string
}
export type Saldo = Billetera
export type Balance = Billetera & { total: number; historial: { totalApostado: number; totalGanado: number; cantidadApuestas: number; cantidadPremios: number; totalDepositado: number; totalRetirado: number; resultadoNeto: number } }
export type RespuestaOperacion = { mensaje: string; saldoActual: number; saldo?: number; movimientoId?: string }

export type Movimiento = {
  id: string
  tipo: 'DEPOSITO' | 'RETIRO' | 'APUESTA' | 'PREMIO'
  monto: number
  saldoAntes: number
  saldoDespues: number
  juego: string | null
  descripcion: string
  fecha: string
}

export type HistorialMovimientos = {
  items: Movimiento[]
  paginacion: {
    pagina: number
    porPagina: number
    total: number
    totalPaginas: number
  }
}

export type FiltrosMovimientos = {
  pagina?: number
  porPagina?: number
  tipo?: Movimiento['tipo']
  desde?: string
  hasta?: string
}

export type Pago = {
  pagoId: string
  estado: 'CREANDO' | 'PENDIENTE' | 'PAGADO' | 'FALLIDO' | 'EXPIRADO'
  monto: number
  moneda: string
  creadoEn: string
  pagadoEn: string | null
}

export type CheckoutCreado = { pagoId: string; checkoutUrl: string; expiraEn: string; operationId?: string }
export type CheckoutCreando = { pagoId: string; estado: 'CREANDO'; operationId?: string }

// Solo se acepta la salida hacia el checkout alojado de Stripe: evita un
// redireccionamiento abierto si la URL fuera manipulada en el cliente.
const HOST_CHECKOUT_PERMITIDO = 'https://checkout.stripe.com/'

export const walletApi = {
  /** GET /api/wallet */
  obtenerBilletera: () => http<Billetera>('wallet'),

  /** GET /api/wallet/balance */
  obtenerBalance: () => http<Balance>('wallet/balance'),

  /** POST /api/payments/checkout — crea una sesión de Stripe (modo test, BOB). */
  crearCheckout: async (monto: number, key?: string) => {
    const respuesta = await ejecutarOperacion<CheckoutCreado | CheckoutCreando>('payments/checkout', { monto }, key)
    const res = respuesta as CheckoutCreado | CheckoutCreando
    if ('estado' in res && res.estado === 'CREANDO') {
      return res as CheckoutCreando
    }
    const cre = res as CheckoutCreado
    if (!cre.checkoutUrl?.startsWith(HOST_CHECKOUT_PERMITIDO)) {
      throw new ApiError({ status: 400, mensaje: 'Respuesta de pago no válida. No se abrió ninguna pasarela.' })
    }
    return cre
  },

  /** GET /api/payments/:id */
  verPago: (pagoId: string) => http<Pago>(`payments/${encodeURIComponent(pagoId)}`),

  /** POST /api/payments/:id/sync — fuerza conciliación con Stripe. */
  sincronizarPago: (pagoId: string) => http<Pago>(`payments/${encodeURIComponent(pagoId)}/sync`, { method: 'POST' }),

  /** POST /api/transactions/deposit */
  depositar: (monto: number) => ejecutarOperacion<RespuestaOperacion>('transactions/deposit', { monto, metodo: 'simulado' }),

  /** POST /api/transactions/withdraw */
  retirar: (monto: number) => ejecutarOperacion<RespuestaOperacion>('transactions/withdraw', { monto, metodo: 'simulado' }),

  /** GET /api/transactions/history */
  historial: (filtros: FiltrosMovimientos = {}) => {
    const params = new URLSearchParams()
    if (filtros.pagina) params.set('pagina', String(filtros.pagina))
    if (filtros.porPagina) params.set('porPagina', String(filtros.porPagina))
    if (filtros.tipo) params.set('tipo', filtros.tipo)
    if (filtros.desde) params.set('desde', filtros.desde)
    if (filtros.hasta) params.set('hasta', filtros.hasta)
    const consulta = params.toString()
    return http<HistorialMovimientos>(`transactions/history${consulta ? `?${consulta}` : ''}`).then((respuesta) => ({
      ...respuesta,
      items: respuesta.items.map((item) => ({
        ...item,
        monto: toNumber(item.monto),
        saldoAntes: toNumber(item.saldoAntes),
        saldoDespues: toNumber(item.saldoDespues),
      })),
    }))
  },
  verSaldo: () => http<Saldo>('wallet'),
  verBalance: () => http<Balance>('wallet/balance'),
}
