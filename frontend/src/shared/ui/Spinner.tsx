import estilos from './Spinner.module.css'

type Props = { etiqueta?: string }

/** Indicador de carga con texto alternativo accesible. */
export function Spinner({ etiqueta = 'Cargando…' }: Props) {
  return (
    <span className={estilos.envoltorio} role="status">
      <span className={estilos.rueda} aria-hidden="true" />
      <span className="visually-hidden">{etiqueta}</span>
    </span>
  )
}
