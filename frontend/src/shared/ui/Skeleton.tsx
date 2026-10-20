import estilos from './Skeleton.module.css'

type Props = {
  ancho?: string
  alto?: string
  /** Forma de pastilla (para avatares/badges). */
  redondo?: boolean
}

/** Bloque de carga decorativo; el estado de carga real se anuncia por región. */
export function Skeleton({ ancho = '100%', alto = '1rem', redondo = false }: Props) {
  return (
    <span
      className={redondo ? `${estilos.hueso} ${estilos.redondo}` : estilos.hueso}
      style={{ width: ancho, height: alto }}
      aria-hidden="true"
    />
  )
}
