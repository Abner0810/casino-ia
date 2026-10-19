import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/features/auth/session.context'

/**
 * Guardia de navegación: organiza el acceso a las rutas privadas.
 * El servidor sigue validando permisos y ownership en cada petición.
 * Si se conservó una ruta de retorno, solo se aceptan rutas internas.
 */
export function RequireAuth() {
  const { autenticado } = useSession()
  const ubicacion = useLocation()

  if (!autenticado) {
    const destino = `${ubicacion.pathname}${ubicacion.search}`
    return <Navigate to="/login" state={{ destino: destino.startsWith('/') ? destino : '/inicio' }} replace />
  }

  return <Outlet />
}
