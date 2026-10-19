import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button, Money, Skeleton } from '@/shared/ui'
import { useSession } from '@/features/auth/session.context'
import { useLogout } from '@/features/auth/auth.hooks'
import { useSaldo } from '@/features/wallet/wallet.hooks'
import { env } from '@/config/env'
import estilos from './PrivateLayout.module.css'

const ENLACES = [
  { a: '/inicio', etiqueta: 'Inicio', icono: '🏠' },
  { a: '/juegos', etiqueta: 'Juegos', icono: '🎲' },
  { a: '/billetera', etiqueta: 'Billetera', icono: '💰' },
  { a: '/movimientos', etiqueta: 'Movimientos', icono: '📄' },
  { a: '/perfil', etiqueta: 'Perfil', icono: '👤' },
] as const

/** Layout privado: navegación, saldo en cabecera y sesión. */
export function PrivateLayout() {
  const { usuario } = useSession()
  const logout = useLogout()
  const saldo = useSaldo()

  return (
    <div className={estilos.marco}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <aside className={estilos.lateral} aria-label="Navegación del panel">
        <Link to="/inicio" className={estilos.marca}>
          <span aria-hidden="true">🎰</span>
          <span>{env.appName}</span>
        </Link>
        <nav aria-label="Secciones del panel" className={estilos.nav}>
          {ENLACES.map((enlace) => (
            <NavLink
              key={enlace.a}
              to={enlace.a}
              className={({ isActive }) => `${estilos.enlace} ${isActive ? estilos.enlaceActivo : ''}`}
            >
              <span aria-hidden="true">{enlace.icono}</span>
              <span>{enlace.etiqueta}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={estilos.columna}>
        <header className={estilos.cabecera}>
          <div className={estilos.saldoBloque}>
            <span className={estilos.saldoEtiqueta}>Saldo de simulación</span>
            {saldo.isPending ? (
              <Skeleton ancho="5rem" alto="1.25rem" />
            ) : saldo.isError ? (
              <span className={estilos.saldoError} title="No se pudo consultar el saldo">
                Sin conexión
              </span>
            ) : (
              <Money valor={saldo.data.totalDisponible} className={estilos.saldoValor} />
            )}
          </div>

          <div className={estilos.usuario}>
            <span className={estilos.nombre}>{usuario?.nombre}</span>
            <Button variante="fantasma" onClick={() => logout.mutate()} cargando={logout.isPending}>
              Cerrar sesión
            </Button>
          </div>
        </header>

        <main id="contenido" className={estilos.contenido}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
