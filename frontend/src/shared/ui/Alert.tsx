import type { ReactNode } from 'react'
import estilos from './Alert.module.css'

type Tipo = 'exito' | 'error' | 'info' | 'aviso'

type Props = {
  tipo: Tipo
  children: ReactNode
  titulo?: string
}

const ICONOS: Record<Tipo, string> = {
  exito: '✓',
  error: '✕',
  info: 'ℹ',
  aviso: '⚠',
}

/** Mensaje de estado accesible: role=alert solo para errores (lectura inmediata). */
export function Alert({ tipo, children, titulo }: Props) {
  return (
    <div
      className={`${estilos.alerta} ${estilos[tipo]}`}
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'error' ? 'assertive' : 'polite'}
    >
      <span className={estilos.icono} aria-hidden="true">
        {ICONOS[tipo]}
      </span>
      <div>
        {titulo && <strong className={estilos.titulo}>{titulo}</strong>}
        <p className={estilos.texto}>{children}</p>
      </div>
    </div>
  )
}
