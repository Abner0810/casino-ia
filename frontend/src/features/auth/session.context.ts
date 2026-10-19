import { createContext, useContext } from 'react'
import type { RespuestaLogin, UsuarioSesion } from './auth.api'

export type ValorSesion = {
  usuario: UsuarioSesion | null
  autenticado: boolean
  /** Guarda la sesión tras un login exitoso. */
  iniciar: (login: RespuestaLogin) => void
  /** Revoca el refresh (mejor esfuerzo) y limpia TODO lo local siempre. */
  cerrar: () => Promise<void>
}

export const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSession(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return valor
}
