import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { qk } from '@/shared/api/queryKeys'
import type { FiltrosMovimientos } from '@/shared/api/queryKeys'
import { useSession } from '@/features/auth/session.context'
import { movimientosApi } from './movimientos.api'

/** Historial paginado; mantiene la página previa mientras carga la siguiente. */
export function useMovimientos(filtros: FiltrosMovimientos) {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.movimientos(usuario?.publicId, filtros),
    queryFn: () => movimientosApi.historial(filtros),
    enabled: Boolean(usuario),
    placeholderData: keepPreviousData,
  })
}
