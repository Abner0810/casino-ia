import { Link } from 'react-router-dom'
import { useSession } from '@/features/auth/session.context'
import estilos from './NoEncontrada.module.css'

/** Página 404 con retorno seguro según la sesión. */
export function NoEncontradaPage() {
  const { autenticado } = useSession()
  const destino = autenticado ? '/inicio' : '/'

  return (
    <div className={estilos.contenedor}>
      <p className={estilos.codigo} aria-hidden="true">
        404
      </p>
      <h1 className={estilos.titulo}>Página no encontrada</h1>
      <p className={estilos.texto}>La dirección solicitada no existe o fue movida.</p>
      <Link to={destino} className={estilos.enlace}>
        {autenticado ? 'Volver a mi panel' : 'Volver al inicio'}
      </Link>
    </div>
  )
}
