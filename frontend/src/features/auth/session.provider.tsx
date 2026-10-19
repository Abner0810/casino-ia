import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { abortarPendientes, configurarSesionHttp, registrarAccesoATokens } from '@/shared/api/http'
import { authApi } from './auth.api'
import { authStore } from './auth.store'
import { ContextoSesion } from './session.context'
import type { ValorSesion } from './session.context'
import type { RespuestaLogin } from './auth.api'

/**
 * Provee la sesión de la aplicación.
 *
 * - Tokens solo en memoria (authStore); el cliente HTTP los lee vía getter.
 * - Al renovar tokens, authStore rota el par y los componentes se enteran.
 * - Al perder la sesión (refresh inválido) o cerrar sesión: se abortan
 *   solicitudes pendientes, se cancela y vacía la caché privada.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const estado = useSyncExternalStore(authStore.suscribir, authStore.obtener)

  // Registro síncrono (una vez) para que cualquier efecto hijo ya tenga
  // configurado el cliente HTTP antes de lanzar su primera consulta.
  const registrado = useRef(false)
  if (!registrado.current) {
    registrado.current = true
    registrarAccesoATokens(() => authStore.obtener().accessToken)
    configurarSesionHttp({
      refrescar: async () => {
        const { refreshToken } = authStore.obtener()
        if (!refreshToken) throw new Error('No hay refresh token disponible')
        const rotado = await authApi.refrescar(refreshToken)
        authStore.rotarTokens(rotado.accessToken, rotado.refreshToken)
      },
      alPerderSesion: () => {
        authStore.limpiar()
        abortarPendientes()
        void queryClient.cancelQueries()
        queryClient.clear()
      },
    })
  }

  const iniciar = useCallback(
    (login: RespuestaLogin) => {
      // Caché limpia al iniciar sesión: nunca se mezclan datos de cuentas.
      queryClient.clear()
      authStore.ponerSesion(login.usuario, login.accessToken, login.refreshToken)
    },
    [queryClient],
  )

  const cerrar = useCallback(async () => {
    const { refreshToken } = authStore.obtener()
    // La limpieza local ocurre SIEMPRE, incluso si falla la red.
    authStore.limpiar()
    abortarPendientes()
    void queryClient.cancelQueries()
    queryClient.clear()
    if (refreshToken) {
      try {
        await authApi.cerrarSesion(refreshToken)
      } catch {
        // La revocación remota no pudo confirmarse; los datos locales ya se limpiaron.
      }
    }
  }, [queryClient])

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario: estado.usuario,
      autenticado: estado.usuario !== null,
      iniciar,
      cerrar,
    }),
    [estado.usuario, iniciar, cerrar],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
