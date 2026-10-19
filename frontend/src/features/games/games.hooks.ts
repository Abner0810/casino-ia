import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/shared/api/queryKeys'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { useSession } from '@/features/auth/session.context'
import { gamesApi } from './games.api'
import type { AccionBlackjack, Juego, ResultadoPlinko } from './games.api'
import type { Riesgo } from './plinko/plinko.constantes'

/**
 * Solicita acceso al juego (valida saldo y trae límites). Se reconsulta al
 * montar cada página de juego para que los límites y el saldo estén frescos.
 */
export function useAccesoJuego(juego: Juego) {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.accesoJuego(usuario?.publicId, juego),
    queryFn: () => gamesApi.acceso(juego),
    enabled: Boolean(usuario),
    staleTime: 0,
    retry: false,
  })
}

export function useRondasPlinko() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.plinkoRondas(usuario?.publicId),
    queryFn: gamesApi.plinko.rondas,
    enabled: Boolean(usuario),
  })
}

export function useConfiguracionPlinko() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: ['plinko', 'config', usuario?.publicId],
    queryFn: gamesApi.plinko.configuracion,
    enabled: Boolean(usuario),
    staleTime: 60_000,
  })
}

export function useRondasBlackjack() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.blackjackRondas(usuario?.publicId),
    queryFn: gamesApi.blackjack.rondas,
    enabled: Boolean(usuario),
  })
}

/**
 * Una única apuesta por ronda: la UI bloquea el botón mientras la mutación
 * o la animación están pendientes. El resultado SIEMPRE viene del servidor.
 */
export function useApostarPlinko() {
  const queryClient = useQueryClient()
  const { usuario } = useSession()
  return useMutation<ResultadoPlinko, Error, { apuesta: number; riesgo: Riesgo }>({
    mutationFn: ({ apuesta, riesgo }) => gamesApi.plinko.apostar(apuesta, riesgo),
    onSuccess: () => {
      invalidarDatosDeDinero(queryClient)
      void queryClient.invalidateQueries({ queryKey: qk.plinkoRondas(usuario?.publicId) })
      void queryClient.invalidateQueries({ queryKey: ['acceso'] })
    },
  })
}

export function useIniciarBlackjack() {
  const queryClient = useQueryClient()
  const { usuario } = useSession()
  return useMutation({
    mutationFn: (apuesta: number) => gamesApi.blackjack.iniciar(apuesta),
    onSuccess: () => {
      invalidarDatosDeDinero(queryClient)
      void queryClient.invalidateQueries({ queryKey: qk.blackjackRondas(usuario?.publicId) })
      void queryClient.invalidateQueries({ queryKey: ['acceso'] })
    },
  })
}

/** Cada acción espera la respuesta del servidor antes de habilitar la siguiente. */
export function useAccionBlackjack() {
  const queryClient = useQueryClient()
  const { usuario } = useSession()
  return useMutation({
    mutationFn: ({ partidaId, accion, version }: { partidaId: string; accion: AccionBlackjack; version: number }) =>
      gamesApi.blackjack.accion(partidaId, accion, version),
    onSuccess: () => {
      invalidarDatosDeDinero(queryClient)
      void queryClient.invalidateQueries({ queryKey: qk.blackjackRondas(usuario?.publicId) })
    },
  })
}
