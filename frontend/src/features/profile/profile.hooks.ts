import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/shared/api/queryKeys'
import { profileApi } from './profile.api'
import type { PerfilEditado } from './profile.api'
import { useSession } from '@/features/auth/session.context'

export function usePerfil() {
  const { usuario } = useSession()
  return useQuery({
    queryKey: qk.perfil(usuario?.publicId),
    queryFn: profileApi.ver,
    enabled: Boolean(usuario),
  })
}

export function useEditarPerfil() {
  const queryClient = useQueryClient()
  const { usuario } = useSession()
  return useMutation<PerfilEditado, Error, string>({
    mutationFn: profileApi.editarNombre,
    onSuccess: (perfil) => {
      queryClient.setQueryData(qk.perfil(usuario?.publicId), perfil)
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
}
