import { http } from '@/shared/api/http'
import type { Rol } from '@/features/auth/auth.api'

export type Perfil = {
  publicId: string
  email: string
  nombre: string
  rol: Rol
  wallet: { saldo: number; bono: number }
  creadoEn: string
}

export type PerfilEditado = Perfil & { mensaje: string }

export const profileApi = {
  /** GET /api/users/profile */
  ver: () => http<Perfil>('users/profile'),

  /** PATCH /api/users/profile — solo el nombre es editable. */
  editarNombre: (nombre: string) => http<PerfilEditado>('users/profile', { method: 'PATCH', body: { nombre } }),
}
