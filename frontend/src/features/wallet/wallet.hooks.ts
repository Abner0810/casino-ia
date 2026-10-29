import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/shared/api/queryKeys'
import { invalidarDatosDeDinero } from '@/shared/api/invalidaciones'
import { useSession } from '@/features/auth/session.context'
import { walletApi } from './wallet.api'

export function useSaldo() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.wallet(usuario?.publicId),
    queryFn: walletApi.verSaldo,
    enabled: Boolean(usuario),
    staleTime: 15_000,
  })
}

export function useBalance() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.balance(usuario?.publicId),
    queryFn: walletApi.verBalance,
    enabled: Boolean(usuario),
  })
}

/**
 * Recarga/retiro simulados. Tras el éxito se reconsultan saldo, balance,
 * perfil y movimientos. Nunca se reintenta sola una mutación: ante timeout
 * el componente muestra el resultado como incierto y ofrece reconciliar.
 */
export function useDepositar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (monto: number) => walletApi.depositar(monto),
    onSuccess: () => invalidarDatosDeDinero(queryClient),
  })
}

export function useRetirar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (monto: number) => walletApi.retirar(monto),
    onSuccess: () => invalidarDatosDeDinero(queryClient),
  })
}

/** Crea la sesión de Stripe Checkout. El saldo se acredita al confirmar el pago. */
export function useCrearCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (monto: number) => walletApi.crearCheckout(monto),
    onSuccess: () => invalidarDatosDeDinero(queryClient),
  })
}

export function usePago(pagoId?: string) {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.pago(usuario?.publicId, pagoId),
    queryFn: () => walletApi.verPago(pagoId!),
    enabled: Boolean(usuario && pagoId),
    retry: 0,
    staleTime: 0,
  })
}

/**
 * Fuerza la conciliación con Stripe. La respuesta se escribe en la caché del
 * pago para que la página de retorno cambie de PENDIENTE a PAGADO sin esperar
 * a que el webhook llegue (puede tardar o no estar configurado en local).
 */
export function useSincronizarPago() {
  const queryClient = useQueryClient()
  const { usuario } = useSession()
  return useMutation({
    mutationFn: (pagoId: string) => walletApi.sincronizarPago(pagoId),
    onSuccess: (pago) => {
      queryClient.setQueryData(qk.pago(usuario?.publicId, pago.pagoId), pago)
      void queryClient.invalidateQueries({ queryKey: ['pago'] })
      invalidarDatosDeDinero(queryClient)
    },
  })
}
