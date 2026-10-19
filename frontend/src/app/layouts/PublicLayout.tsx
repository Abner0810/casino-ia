import { Link, Outlet } from 'react-router-dom'
import { useSession } from '@/features/auth/session.context'
import { env } from '@/config/env'
import { Alert } from '@/shared/ui'
import estilos from './PublicLayout.module.css'

/** Layout de páginas públicas (presentación, registro, login). */
export function PublicLayout() {
  const { autenticado } = useSession()

  return (
    <div className={estilos.pagina}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className={estilos.cabecera}>
        <div className={estilos.barra}>
          <Link to="/" className={estilos.marca}>
            <span aria-hidden="true">🎰</span>
            <span>{env.appName}</span>
          </Link>
          <nav aria-label="Navegación principal" className={estilos.navegacion}>
            {autenticado ? (
              <Link to="/inicio" className={estilos.enlaceDestacado}>
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link to="/login" className={estilos.enlace}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className={estilos.enlaceDestacado}>
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="contenido" className={estilos.contenido}>
        {!env.apiConfigured && <Alert tipo="aviso" titulo="Conexión pendiente">Las cuentas, la billetera y los juegos estarán disponibles cuando se habilite la conexión del simulador.</Alert>}
        <Outlet />
      </main>

      <footer className={estilos.pie}>
        <p>
          {env.appName} es un <strong>simulador</strong>: todo el saldo es de prueba y no se juega con dinero real.
        </p>
      </footer>
    </div>
  )
}
