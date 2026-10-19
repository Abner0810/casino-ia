import { http } from '@/shared/api/http'
import { ejecutarOperacion } from '@/shared/api/operations'

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

export const walletApi = {
  /** GET /api/wallet */
  verSaldo: () => http<Saldo>('wallet'),

  /** GET /api/wallet/balance */
  verBalance: () => http<Balance>('wallet/balance'),

  /** POST /api/transactions/deposit — recarga simulada, sin datos de pago reales. */
  depositar: (monto: number, metodo: MetodoSimulado = 'simulado') =>
    ejecutarOperacion<RespuestaOperacion>('transactions/deposit', { monto, metodo }),

  /** POST /api/transactions/withdraw */
  retirar: (monto: number, metodo: MetodoSimulado = 'simulado') =>
    ejecutarOperacion<RespuestaOperacion>('transactions/withdraw', { monto, metodo }),
}
