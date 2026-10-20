import { useMutation } from '@tanstack/react-query'
import { authApi } from './auth.api'
import type { DatosLogin, DatosRegistro, RespuestaLogin } from './auth.api'
import { useSession } from './session.context'

/** POST /auth/login → guarda sesión y limpia caché previa. */
export function useLogin() {
  const { iniciar } = useSession()
  return useMutation<RespuestaLogin, Error, DatosLogin>({
    mutationFn: authApi.iniciarSesion,
    onSuccess: (respuesta) => iniciar(respuesta),
  })
}

/** POST /auth/register → NO inicia sesión: el registro no devuelve tokens. */
export function useRegistro() {
  return useMutation({
    mutationFn: (datos: DatosRegistro) => authApi.registrar(datos),
  })
}

/** Cierra sesión local y revoca el refresh (mejor esfuerzo). */
export function useLogout() {
  const { cerrar } = useSession()
  return useMutation({
    mutationFn: cerrar,
  })
}
