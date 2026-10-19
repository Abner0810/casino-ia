import { http } from '@/shared/api/http'

export type Rol = 'USER' | 'ADMIN'

export type UsuarioSesion = {
  publicId: string
  email: string
  nombre: string
  rol: Rol
}

export type RespuestaLogin = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInMinutes: number
  usuario: UsuarioSesion
}

export type RespuestaRefresh = Omit<RespuestaLogin, 'usuario'>

export type RespuestaRegistro = {
  publicId: string
  email: string
  nombre: string
  mensaje: string
}

export type DatosRegistro = { nombre: string; email: string; password: string }
export type DatosLogin = { email: string; password: string }

export const authApi = {
  /** POST /api/auth/register — no devuelve tokens: tras el registro se va a login. */
  registrar: (datos: DatosRegistro) =>
    http<RespuestaRegistro>('auth/register', { method: 'POST', body: datos, auth: false }),

  /** POST /api/auth/login */
  iniciarSesion: (datos: DatosLogin) =>
    http<RespuestaLogin>('auth/login', { method: 'POST', body: datos, auth: false }),

  /** POST /api/auth/refresh — rota el par de tokens; no devuelve usuario. */
  refrescar: (refreshToken: string) =>
    http<RespuestaRefresh>('auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),

  /** POST /api/auth/logout — revoca el refresh token. */
  cerrarSesion: (refreshToken: string, accessToken: string) =>
    http<{ mensaje: string }>('auth/logout', { method: 'POST', body: { refreshToken }, auth: false, accessToken }),
}
