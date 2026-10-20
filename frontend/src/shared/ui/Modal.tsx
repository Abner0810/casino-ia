import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import estilos from './Modal.module.css'

type Props = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
  /** Botones/acciones del pie del diálogo (el primario puede llevar data-autofoco). */
  pie?: ReactNode
}

/**
 * Diálogo accesible: foco contenido, Escape cierra, el foco vuelve al
 * elemento que lo abrió y fondo con scroll bloqueado.
 */
export function Modal({ abierto, alCerrar, titulo, children, pie }: Props) {
  const refContenedor = useRef<HTMLDivElement>(null)
  const refAnterior = useRef<HTMLElement | null>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!abierto) return
    refAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const contenedor = refContenedor.current
    const focoInicial =
      contenedor?.querySelector<HTMLElement>('[data-autofoco]') ??
      contenedor?.querySelector<HTMLElement>('button, [href], input, select, textarea') ??
      contenedor
    focoInicial?.focus()

    const alTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        alCerrar()
        return
      }
      if (evento.key !== 'Tab' || !contenedor) return
      const focables = Array.from(
        contenedor.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focables.length === 0) return
      const primero = focables[0]
      const ultimo = focables[focables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclar, true)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alTeclar, true)
      document.body.style.overflow = overflowPrevio
      refAnterior.current?.focus()
    }
  }, [abierto, alCerrar])

  if (!abierto) return null

  return (
    <div
      className={estilos.fondo}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar()
      }}
    >
      <div
        ref={refContenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={estilos.modal}
        tabIndex={-1}
      >
        <header className={estilos.cabecera}>
          <h2 id={idTitulo} className={estilos.titulo}>
            {titulo}
          </h2>
          <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar diálogo">
            ✕
          </button>
        </header>
        <div className={estilos.cuerpo}>{children}</div>
        {pie && <footer className={estilos.pie}>{pie}</footer>}
      </div>
    </div>
  )
}
