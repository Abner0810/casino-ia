import { http } from '@/shared/api/http'
import { ejecutarOperacion } from '@/shared/api/operations'
import { ApiError } from '@/shared/api/errors'

/** Saldo mostrado en cabecera y billetera. El bono va SEPARADO del saldo. */
export type Saldo = {
  saldo: number
  bono: number
  totalDisponible: number
  actualizadoEn: string
}

export type Balance = {
  saldo: number
  bono: number
  total: number
  historial: {
    totalApostado: number
    totalGanado: number
    cantidadApuestas: number
    cantidadPremios: number
    totalDepositado: number
    totalRetirado: number
    resultadoNeto: number
  }
}

export type RespuestaOperacion = { mensaje: string; saldoActual: number }

export type MetodoSimulado = 'simulado'

export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'FALLIDO' | 'EXPIRADO'

export type Pago = {
  pagoId: string
  estado: EstadoPago
  monto: number
  moneda: string
  creadoEn: string
  pagadoEn: string | null
}

export type CheckoutCreado = { pagoId: string; checkoutUrl: string; expiraEn: string }

// Solo se acepta la salida hacia el checkout alojado de Stripe: evita un
// open redirect si la respuesta del backend se manipulara.
const HOST_CHECKOUT_PERMITIDO = 'https://checkout.stripe.com/'

export const walletApi = {
  /** GET /api/wallet */
  verSaldo: () => http<Saldo>('wallet'),

  /** GET /api/wallet/balance */
  verBalance: () => http<Balance>('wallet/balance'),

  /** POST /api/transactions/deposit - recarga simulada, sin datos de pago reales. */
  depositar: (monto: number, metodo: MetodoSimulado = 'simulado') =>
    ejecutarOperacion<RespuestaOperacion>('transactions/deposit', { monto, metodo }),

  /** POST /api/transactions/withdraw */
  retirar: (monto: number, metodo: MetodoSimulado = 'simulado') =>
    ejecutarOperacion<RespuestaOperacion>('transactions/withdraw', { monto, metodo }),

  /** POST /api/payments/checkout — crea una sesión de Stripe (modo test, BOB). */
  crearCheckout: async (monto: number): Promise<CheckoutCreado> => {
    const respuesta = await ejecutarOperacion<CheckoutCreado>('payments/checkout', { monto })
    if (!respuesta.checkoutUrl?.startsWith(HOST_CHECKOUT_PERMITIDO)) {
      throw new ApiError({ status: 0, mensaje: 'Respuesta de pago no válida. No se abrió ninguna pasarela.' })
    }
    return respuesta
  },

  /** GET /api/payments/:id */
  verPago: (pagoId: string) => http<Pago>(`payments/${encodeURIComponent(pagoId)}`),

  /** GET /api/payments/:id/sync — fuerza conciliación con Stripe. */
  sincronizarPago: (pagoId: string) => http<Pago>(`payments/${encodeURIComponent(pagoId)}/sync`),
}
