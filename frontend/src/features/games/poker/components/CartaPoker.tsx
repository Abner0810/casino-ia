import estilos from './CartaPoker.module.css'

type Props = { carta: string | null; etiqueta: string; demora?: number }

export function CartaPoker({ carta, etiqueta, demora = 0 }: Props) {
  const oculta = carta === '🂠'
  const pendiente = carta === null
  const roja = carta !== null && /[♥♦]/u.test(carta)
  const valor = !pendiente && !oculta ? carta.slice(0, -1) : ''
  const palo = !pendiente && !oculta ? carta.slice(-1) : ''

  return (
    <span
      role="img"
      aria-label={`${etiqueta}: ${pendiente ? 'pendiente' : oculta ? 'carta oculta' : carta}`}
      className={`${estilos.carta} ${oculta ? estilos.oculta : ''} ${pendiente ? estilos.pendiente : ''} ${roja ? estilos.roja : ''}`}
      style={{ animationDelay: `${demora}ms` }}
    >
      {pendiente ? <span aria-hidden="true">·</span> : oculta ? <span className={estilos.reverso} aria-hidden="true">♠</span> : (
        <>
          <span className={estilos.esquina} aria-hidden="true">{valor}<small>{palo}</small></span>
          <span className={estilos.palo} aria-hidden="true">{palo}</span>
          <span className={estilos.esquinaInferior} aria-hidden="true">{valor}<small>{palo}</small></span>
        </>
      )}
    </span>
  )
}
