import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import estilos from './Button.module.css'

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  /** Muestra indicador de carga y deshabilita el botón (bloquea doble envío). */
  cargando?: boolean
  ancho?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primario', cargando = false, ancho = false, children, disabled, className, type = 'button', ...rest },
  ref,
) {
  const clases = [estilos.boton, estilos[variante], ancho ? estilos.ancho : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...rest}
    >
      {cargando && <span className={estilos.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
})
