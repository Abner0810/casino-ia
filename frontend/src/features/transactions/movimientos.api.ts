import { http } from '@/shared/api/http'
import type { FiltrosMovimientos } from '@/shared/api/queryKeys'

export type TipoMovimiento = 'DEPOSITO' | 'RETIRO' | 'APUESTA' | 'PREMIO'

export type Movimiento = {
  id: string
  tipo: TipoMovimiento
  monto: number
  saldoAntes: number
  saldoDespues: number
  juego: string | null
  descripcion: string
  fecha: string
}

export type Paginacion = {
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
}

export type HistorialMovimientos = {
  items: Movimiento[]
  paginacion: Paginacion
}

export const movimientosApi = {
  /** GET /api/transactions/history?pagina&porPagina&tipo&desde&hasta */
  historial: (filtros: FiltrosMovimientos) =>
    http<HistorialMovimientos>('transactions/history', { query: { ...filtros } }),
}
