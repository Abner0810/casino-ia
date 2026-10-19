import type { UsuarioSesion } from './auth.api'

// Almacén de sesión SOLO EN MEMORIA (decisión inicial del plan §7):
// recargar la página exige iniciar sesión de nuevo; los 7 días del refresh
// son vigencia backend, no persistencia del navegador. Nunca se escriben
// tokens en localStorage/sessionStorage/cookies.

export type EstadoSesion = {
  usuario: UsuarioSesion | null
  accessToken: string | null
  refreshToken: string | null
}

let estado: EstadoSesion = { usuario: null, accessToken: null, refreshToken: null }
const oyentes = new Set<() => void>()

function notificar(): void {
  for (const oyente of oyentes) oyente()
}

export const authStore = {
  obtener(): EstadoSesion {
    return estado
  },

  ponerSesion(usuario: UsuarioSesion, accessToken: string, refreshToken: string): void {
    estado = { usuario, accessToken, refreshToken }
    notificar()
  },

  rotarTokens(accessToken: string, refreshToken: string): void {
    if (!estado.usuario) return
    estado = { ...estado, accessToken, refreshToken }
    notificar()
  },

  limpiar(): void {
    estado = { usuario: null, accessToken: null, refreshToken: null }
    notificar()
  },

  suscribir(oyente: () => void): () => void {
    oyentes.add(oyente)
    return () => {
      oyentes.delete(oyente)
    }
  },
}
