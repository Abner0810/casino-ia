import estilos from './Cargando.module.css'
import { Spinner } from './Spinner'

type Props = { mensaje?: string }

/** Pantalla/sector de carga completa (conexión pendiente con el servidor). */
export function Cargando({ mensaje = 'Conectando con el servidor…' }: Props) {
  return (
    <div className={estilos.cargando} role="status" aria-live="polite">
      <Spinner />
      <p className={estilos.mensaje}>{mensaje}</p>
    </div>
  )
}
