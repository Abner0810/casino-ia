import { useEffect, useState } from 'react'

/** Respeta la preferencia del sistema de movimiento reducido. */
export function useReducedMotion(): boolean {
  const [reducido, setReducido] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiar = (evento: MediaQueryListEvent) => setReducido(evento.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  return reducido
}
